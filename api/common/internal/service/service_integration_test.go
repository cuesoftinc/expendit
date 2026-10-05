package service_test

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/cuesoftinc/expendit/api/common/internal/auth"
	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/service"
	"github.com/cuesoftinc/expendit/api/common/internal/storage"
	"github.com/cuesoftinc/expendit/api/common/internal/ticket"
	"github.com/cuesoftinc/expendit/api/common/migrations"
)

// The integration suite runs against a real Postgres as a NON-superuser
// role, so row-level security is actually enforced. It uses
// TEST_DATABASE_URL (a superuser URL) when set, else an embedded Postgres.

type memStore struct{ objects map[string][]byte }

func (m *memStore) Bucket() string { return "test" }
func (m *memStore) Prefix() string { return "expendit/test" }
func (m *memStore) Put(_ context.Context, k string, d []byte, _ string) error {
	m.objects[k] = d
	return nil
}
func (m *memStore) Get(_ context.Context, k string) ([]byte, error) { return m.objects[k], nil }
func (m *memStore) Delete(_ context.Context, k string) error        { delete(m.objects, k); return nil }
func (m *memStore) List(context.Context, string) ([]storage.Object, error) {
	return nil, nil
}

type env struct {
	db         *repository.DB
	store      *memStore
	contract   *kafka.Contract
	identity   *service.Identity
	ledger     *service.Ledger
	imports    *service.Imports
	statements *service.Statements
	compute    *service.Compute
}

func freePort(t *testing.T) uint32 {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return uint32(l.Addr().(*net.TCPAddr).Port)
}

func setup(t *testing.T) *env {
	if testing.Short() {
		t.Skip("integration test")
	}
	ctx := context.Background()
	superURL := os.Getenv("TEST_DATABASE_URL")
	if superURL == "" {
		port := freePort(t)
		dir := t.TempDir()
		pg := embeddedpostgres.NewDatabase(embeddedpostgres.DefaultConfig().Port(port).
			RuntimePath(filepath.Join(dir, "run")).DataPath(filepath.Join(dir, "data")).StartTimeout(2 * time.Minute))
		if err := pg.Start(); err != nil {
			t.Fatalf("embedded postgres: %v", err)
		}
		t.Cleanup(func() { _ = pg.Stop() })
		superURL = fmt.Sprintf("postgres://postgres:postgres@127.0.0.1:%d/postgres?sslmode=disable", port)
	}

	super, err := pgx.Connect(ctx, superURL)
	if err != nil {
		t.Fatal(err)
	}
	dbName := fmt.Sprintf("expendit_test_%d", time.Now().UnixNano())
	for _, stmt := range []string{
		`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'expendit_app') THEN
			CREATE ROLE expendit_app LOGIN PASSWORD 'app' NOSUPERUSER NOBYPASSRLS; END IF; END $$`,
		`CREATE DATABASE ` + dbName + ` OWNER expendit_app`,
	} {
		if _, err := super.Exec(ctx, stmt); err != nil {
			t.Fatal(err)
		}
	}
	super.Close(ctx)

	appURL := strings.Replace(superURL, "postgres:postgres@", "expendit_app:app@", 1)
	appURL = appURL[:strings.LastIndex(appURL, "/")+1] + dbName + "?sslmode=disable"
	pool, err := pgxpool.New(ctx, appURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if err := migrations.Apply(ctx, pool); err != nil {
		t.Fatal(err)
	}
	db := &repository.DB{Pool: pool}
	if err := service.SeedRulesets(ctx, db); err != nil {
		t.Fatal(err)
	}

	_, key, _ := ed25519.GenerateKey(rand.Reader)
	signer := ticket.NewSigner("test", key, 5*time.Minute)
	contract, err := kafka.LoadContract()
	if err != nil {
		t.Fatal(err)
	}
	e := &env{db: db, store: &memStore{objects: map[string][]byte{}}, contract: contract}
	e.identity = &service.Identity{DB: db}
	e.ledger = &service.Ledger{DB: db}
	e.compute = &service.Compute{DB: db, Now: time.Now}
	e.imports = &service.Imports{DB: db, Tickets: signer, Store: e.store, MaxBytes: 15 << 20, PerHour: 10, PerDay: 30, BytesDay: 200 << 20, Now: time.Now}
	e.statements = &service.Statements{DB: db, Imports: e.imports, Compute: e.compute, Tickets: signer, MaxBytes: 15 << 20}
	return e
}

func (e *env) signIn(t *testing.T, uid, email string) *middleware.Principal {
	ctx := context.Background()
	userID, err := e.identity.SignIn(ctx, &auth.Identity{UID: uid, Email: email, Name: strings.Split(email, "@")[0]})
	if err != nil {
		t.Fatal(err)
	}
	orgID, role, err := e.identity.ResolveOrg(ctx, userID, "")
	if err != nil {
		t.Fatal(err)
	}
	return &middleware.Principal{UserID: userID, Email: email, OrgID: orgID, Role: role}
}

// outbox returns unsent payloads for topic, each validated against the contract.
func (e *env) outbox(t *testing.T, topic string) []map[string]any {
	var out []map[string]any
	err := e.db.AsSystem(context.Background(), func(tx pgx.Tx) error {
		rows, err := tx.Query(context.Background(), `SELECT payload FROM outbox WHERE topic = $1 AND published_at IS NULL ORDER BY id`, topic)
		if err != nil {
			return err
		}
		defer rows.Close()
		for rows.Next() {
			var raw []byte
			if err := rows.Scan(&raw); err != nil {
				return err
			}
			if err := e.contract.Validate(topic, raw); err != nil {
				t.Errorf("outbox %s violates the contract: %v\n%s", topic, err, raw)
			}
			var m map[string]any
			_ = json.Unmarshal(raw, &m)
			out = append(out, m)
		}
		return rows.Err()
	})
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func jti(t *testing.T, encoded string) string {
	parts := strings.Split(encoded, ".")
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		t.Fatal(err)
	}
	var c ticket.Claims
	_ = json.Unmarshal(raw, &c)
	return c.JTI
}

func code(err error) string {
	var e *service.Error
	if errors.As(err, &e) {
		return e.Code
	}
	if errors.Is(err, repository.ErrNotFound) {
		return "not_found"
	}
	if err != nil {
		return err.Error()
	}
	return ""
}

func TestIntegration(t *testing.T) {
	e := setup(t)
	ctx := context.Background()

	// ── Sign-in, personal orgs, tenancy ─────────────────────────────────
	alice := e.signIn(t, "uid-alice", "alice@example.com")
	bob := e.signIn(t, "uid-bob", "bob@example.com")
	if alice.Role != model.RoleOwner || alice.OrgID == bob.OrgID {
		t.Fatalf("personal orgs: %+v %+v", alice, bob)
	}
	cats, err := e.ledger.Categories(ctx, alice, false)
	if err != nil || len(cats) != len(service.DefaultCategories) {
		t.Fatalf("default categories: %d %v", len(cats), err)
	}
	catID := map[string]string{}
	for _, c := range cats {
		catID[c.Type+":"+c.Name] = c.ID
	}
	// RLS: Bob can't read Alice's category, even by id.
	if _, err := e.ledger.Category(ctx, bob, catID["expense:Food"]); code(err) != "not_found" {
		t.Fatalf("cross-org read must be not_found, got %v", err)
	}
	// Bob isn't a member of Alice's org.
	if _, _, err := e.identity.ResolveOrg(ctx, bob.UserID, alice.OrgID); !errors.Is(err, middleware.ErrNotMember) {
		t.Fatalf("membership: %v", err)
	}

	// ── Manual ledger entry ─────────────────────────────────────────────
	date := time.Now().AddDate(0, 0, -3).Format("2006-01-02")
	desc, amt, dir, food := "CHICKEN REPUBLIC IKEJA", 4500.0, "expense", catID["expense:Food"]
	if _, err := e.ledger.CreateTxn(ctx, alice, service.TxnInput{Description: &desc, Amount: &amt, Direction: &dir, CategoryID: &food, TxnDate: &date}); err != nil {
		t.Fatal(err)
	}
	income := catID["income:Income"]
	if _, err := e.ledger.CreateTxn(ctx, alice, service.TxnInput{Description: &desc, Amount: &amt, Direction: &dir, CategoryID: &income, TxnDate: &date}); code(err) != "validation_failed" {
		t.Fatalf("an expense in an income category must be refused, got %v", err)
	}

	// ── Import: create → upload.received → import.processed → confirm ──
	if _, err := e.imports.Create(ctx, alice, service.CreateImport{FileName: "r.jpg", Size: 100}, ""); code(err) != "consent_required" {
		t.Fatalf("image without AI consent: %v", err)
	}
	if _, err := e.imports.Create(ctx, alice, service.CreateImport{FileName: "big.pdf", FileType: "pdf", Size: 16 << 20}, ""); code(err) != "file_too_large" {
		t.Fatalf("oversize: %v", err)
	}
	created, err := e.imports.Create(ctx, alice, service.CreateImport{FileName: "gtb.csv", Size: 100}, "key-1") // type from the name, as the web sends
	if err != nil || created.UploadTicket == "" {
		t.Fatalf("create import: %+v %v", created, err)
	}
	again, err := e.imports.Create(ctx, alice, service.CreateImport{FileName: "gtb.csv", FileType: "csv", Size: 100}, "key-1")
	if err != nil || again.JobID != created.JobID {
		t.Fatalf("idempotency key must return the same job: %v %v", again, err)
	}

	objKey := "expendit/test/tmp/" + created.JobID + "/" + jti(t, created.UploadTicket)
	e.store.objects[objKey] = []byte("csv bytes")
	upload := func(ticketID string) json.RawMessage {
		b, _ := json.Marshal(map[string]any{
			"ticket_id": ticketID, "org_id": alice.OrgID, "target": map[string]string{"kind": "import_job", "id": created.JobID},
			"file_name": "gtb.csv", "file_type": "csv", "object": map[string]any{"bucket": "test", "key": objKey, "size": 9},
		})
		if err := e.contract.Validate(kafka.TopicUploadReceived, b); err != nil {
			t.Fatal(err)
		}
		return b
	}
	if err := e.imports.OnUploadReceived(ctx, upload(jti(t, created.UploadTicket)), e.statements.UploadRouter()); err != nil {
		t.Fatal(err)
	}
	ready := e.outbox(t, kafka.TopicImportReady)
	if len(ready) != 1 || ready[0]["job_id"] != created.JobID || ready[0]["ai_allowed"] != false {
		t.Fatalf("import.ready: %+v", ready)
	}
	ledgerRef := ready[0]["reference"].(map[string]any)["ledger"].([]any)
	if len(ledgerRef) != 1 {
		t.Fatalf("reference ledger should hold Alice's row only: %v", ledgerRef)
	}
	// A replayed upload.received is dropped (single-use ticket).
	if err := e.imports.OnUploadReceived(ctx, upload(jti(t, created.UploadTicket)), e.statements.UploadRouter()); err != nil {
		t.Fatal(err)
	}
	if len(e.outbox(t, kafka.TopicImportReady)) != 1 {
		t.Fatal("a replayed ticket must not queue a second import.ready")
	}

	processed, _ := json.Marshal(map[string]any{
		"job_id": created.JobID, "org_id": alice.OrgID, "status": "completed", "file_type": "csv",
		"total_parsed": 2, "duplicates_found": 1,
		"transactions": []map[string]any{
			{"txn_date": date, "amount": 4500, "direction": "expense", "description": desc, "category_id": food,
				"category_name": "Food", "ai_categorized": false, "is_duplicate": true},
			{"txn_date": date, "amount": 90000, "direction": "expense", "description": "NEW GADGET", "category_name": "Gadgets",
				"ai_categorized": true, "is_duplicate": false},
		},
		"summary":   map[string]any{"total_income": 0, "total_expense": 90000, "net": -90000, "by_category": map[string]any{"Gadgets": 90000}},
		"anomalies": []map[string]any{{"rule_id": "large_transaction", "severity": "warn", "note": "big", "txn_index": 1}},
		"warnings":  []string{},
	})
	if err := e.contract.Validate(kafka.TopicImportProcessed, processed); err != nil {
		t.Fatal(err)
	}
	if err := e.imports.OnImportProcessed(ctx, processed); err != nil {
		t.Fatal(err)
	}
	if _, ok := e.store.objects[objKey]; ok {
		t.Fatal("the raw upload must be deleted once processed (S-4)")
	}
	detail, err := e.imports.Get(ctx, alice, created.JobID)
	if err != nil || detail.Job.Status != "completed" || len(detail.Staged) != 2 || len(detail.Job.Anomalies) != 1 {
		t.Fatalf("job after processing: %+v %v", detail, err)
	}
	if _, err := e.imports.Get(ctx, bob, created.JobID); code(err) != "not_found" {
		t.Fatalf("Bob must not see Alice's job: %v", err)
	}

	res, err := e.imports.Confirm(ctx, alice, created.JobID)
	if err != nil || res.Imported != 1 || res.Discarded != 1 {
		t.Fatalf("confirm: %+v %v", res, err)
	}
	if res2, err := e.imports.Confirm(ctx, alice, created.JobID); err != nil || res2.Imported != 1 {
		t.Fatalf("second confirm must be a no-op: %+v %v", res2, err)
	}
	page, err := e.ledger.Txns(ctx, alice, repository.TxnFilter{AnomalyOnly: true})
	if err != nil || len(page.Items) != 1 || page.Items[0].Description != "NEW GADGET" || page.Items[0].Source != "csv" {
		t.Fatalf("ledger after confirm: %+v %v", page, err)
	}
	cats, _ = e.ledger.Categories(ctx, alice, false)
	var gadgets *model.Category
	for i := range cats {
		if cats[i].Name == "Gadgets" {
			gadgets = &cats[i]
		}
	}
	if gadgets == nil || !gadgets.AIProposed || gadgets.TxnCountYTD != 1 {
		t.Fatalf("analytics' new category must be created as AI-proposed: %+v", gadgets)
	}

	// ── Company org, statements, validation, ratios ─────────────────────
	company, err := e.identity.CreateOrg(ctx, alice, service.OrgInput{Name: "Acme Ltd", Kind: "company", Currency: "NGN", Country: "NG"})
	if err != nil {
		t.Fatal(err)
	}
	acme := &middleware.Principal{UserID: alice.UserID, Email: alice.Email, OrgID: company.ID, Role: model.RoleOwner}
	in := service.StatementInput{Kind: "balance_sheet", Period: "FY2025"}
	for _, li := range []struct {
		k string
		v float64
	}{{"total_assets", 200}, {"total_liabilities", 120}, {"equity", 80}} {
		in.LineItems = append(in.LineItems, struct {
			CanonicalKey string  `json:"canonical_key"`
			Amount       float64 `json:"amount"`
			Label        string  `json:"label"`
		}{li.k, li.v, ""})
	}
	st, err := e.statements.Create(ctx, acme, in, "")
	if err != nil || st.MappingStatus != "staged" {
		t.Fatalf("manual statement: %+v %v", st, err)
	}
	if _, err := e.statements.Confirm(ctx, acme, st.StatementID); code(err) != "validation_pending" {
		t.Fatalf("confirm before validation must be 409 validation_pending, got %v", err)
	}
	requests := e.outbox(t, kafka.TopicComputeRequested)
	if len(requests) != 1 || requests[0]["kind"] != "statement_validation" {
		t.Fatalf("compute.requested: %+v", requests)
	}
	result, _ := json.Marshal(map[string]any{
		"request_id": requests[0]["request_id"], "org_id": company.ID, "kind": "statement_validation",
		"data_version": requests[0]["data_version"], "period": "FY2025", "statement_id": st.StatementID, "status": "ok",
		"validation": map[string]any{"ok": true, "codes": []string{}, "mapping_version": 1, "derived": []any{}, "warnings": []string{}},
	})
	if err := e.contract.Validate(kafka.TopicComputeResults, result); err != nil {
		t.Fatal(err)
	}
	if err := e.compute.OnComputeResults(ctx, result); err != nil {
		t.Fatal(err)
	}
	confirmed, err := e.statements.Confirm(ctx, acme, st.StatementID)
	if err != nil || confirmed.MappingStatus != "confirmed" {
		t.Fatalf("confirm after validation: %+v %v", confirmed, err)
	}
	kinds := map[string]int{}
	for _, r := range e.outbox(t, kafka.TopicComputeRequested) {
		kinds[r["kind"].(string)]++
	}
	if kinds["ratios"] != 1 {
		t.Fatalf("a confirm must queue ratios: %v", kinds)
	}
	view, err := e.compute.Ratios(ctx, acme, "FY2025", false)
	if err != nil || view.Status != "recomputing" {
		t.Fatalf("ratios before results: %+v %v", view, err)
	}

	// ── Tax estimates are requested on read ─────────────────────────────
	est, err := e.compute.Estimates(ctx, alice)
	if err != nil || est.Status != "recomputing" {
		t.Fatalf("estimates: %+v %v", est, err)
	}

	// ── Rule sets were queued for the compacted topic ───────────────────
	if sets := e.outbox(t, kafka.TopicConfigRulesets); len(sets) != 5 {
		t.Fatalf("rule sets queued: %d", len(sets))
	}
}
