package repository

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/model"
)

const jobCols = `id, org_id, source, status, file_name, file_type, total_parsed, duplicates_found, imported, summary,
	ai_summary, anomalies, warnings, error_code, confirmed, created_at, completed_at, created_by, object_key`

func scanJob(row pgx.Row) (*model.ImportJob, error) {
	var j model.ImportJob
	var summary, anomalies, warnings []byte
	if err := row.Scan(&j.ID, &j.OrgID, &j.Source, &j.Status, &j.FileName, &j.FileType, &j.TotalParsed, &j.DuplicatesFound,
		&j.Imported, &summary, &j.AISummary, &anomalies, &warnings, &j.ErrorCode, &j.Confirmed, &j.CreatedAt, &j.CompletedAt,
		&j.CreatedBy, &j.ObjectKey); err != nil {
		return nil, translate(err)
	}
	if len(summary) > 0 {
		j.Summary = &model.ImportSummary{}
		if err := json.Unmarshal(summary, j.Summary); err != nil {
			return nil, err
		}
	}
	j.Anomalies, j.Warnings = []model.Anomaly{}, []string{}
	if err := json.Unmarshal(anomalies, &j.Anomalies); err != nil {
		return nil, err
	}
	return &j, json.Unmarshal(warnings, &j.Warnings)
}

// CreateImportJob inserts a job awaiting its upload. A live job with the
// same idempotency key is returned instead (existing = true).
func CreateImportJob(ctx context.Context, tx pgx.Tx, orgID, userID, fileName, fileType string, declaredBytes int64, idemKey *string) (job *model.ImportJob, existing bool, err error) {
	if idemKey != nil {
		job, err = scanJob(tx.QueryRow(ctx, `SELECT `+jobCols+` FROM import_job
			WHERE org_id = $1 AND idempotency_key = $2 AND status <> 'failed'`, orgID, *idemKey))
		if err == nil {
			return job, true, nil
		} else if err != ErrNotFound {
			return nil, false, err
		}
	}
	job, err = scanJob(tx.QueryRow(ctx, `INSERT INTO import_job (org_id, created_by, source, status, file_name, file_type, declared_bytes, idempotency_key)
		VALUES ($1, $2, 'upload', 'awaiting_upload', $3, $4, $5, $6) RETURNING `+jobCols,
		orgID, userID, fileName, fileType, declaredBytes, idemKey))
	return job, false, err
}

func GetImportJob(ctx context.Context, tx pgx.Tx, id string) (*model.ImportJob, error) {
	return scanJob(tx.QueryRow(ctx, `SELECT `+jobCols+` FROM import_job WHERE id = $1`, id))
}

// LockImportJob reads the job FOR UPDATE, serializing consumers and confirm.
func LockImportJob(ctx context.Context, tx pgx.Tx, id string) (*model.ImportJob, error) {
	return scanJob(tx.QueryRow(ctx, `SELECT `+jobCols+` FROM import_job WHERE id = $1 FOR UPDATE`, id))
}

func ListImportJobs(ctx context.Context, tx pgx.Tx) ([]model.ImportJob, error) {
	rows, err := tx.Query(ctx, `SELECT `+jobCols+` FROM import_job WHERE status <> 'awaiting_upload' ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	return collect(rows, scanJob)
}

func StartImportProcessing(ctx context.Context, tx pgx.Tx, id, objectKey, fileName, fileType string) error {
	_, err := tx.Exec(ctx, `UPDATE import_job SET status = 'processing', processing_at = now(), object_key = $2,
		file_name = coalesce(nullif($3, ''), file_name), file_type = $4 WHERE id = $1`, id, objectKey, fileName, fileType)
	return err
}

type ImportResult struct {
	Status          string
	ErrorCode       *string
	FileType        *string
	TotalParsed     int
	DuplicatesFound int
	Summary         *model.ImportSummary
	AISummary       *string
	Anomalies       []model.Anomaly
	Warnings        []string
}

func CompleteImport(ctx context.Context, tx pgx.Tx, id string, r ImportResult) error {
	if r.Anomalies == nil {
		r.Anomalies = []model.Anomaly{}
	}
	if r.Warnings == nil {
		r.Warnings = []string{}
	}
	_, err := tx.Exec(ctx, `UPDATE import_job SET status = $2, error_code = $3, file_type = coalesce($4, file_type),
		total_parsed = $5, duplicates_found = $6, summary = $7, ai_summary = $8, anomalies = $9, warnings = $10,
		completed_at = now() WHERE id = $1`,
		id, r.Status, r.ErrorCode, r.FileType, r.TotalParsed, r.DuplicatesFound, jsonOrNil(r.Summary), r.AISummary,
		mustJSON(r.Anomalies), mustJSON(r.Warnings))
	return err
}

func FailImport(ctx context.Context, tx pgx.Tx, id, code string) error {
	_, err := tx.Exec(ctx, `UPDATE import_job SET status = 'failed', error_code = $2, completed_at = now() WHERE id = $1`, id, code)
	return err
}

func InsertStaged(ctx context.Context, tx pgx.Tx, orgID, jobID string, position int, s model.StagedTxn, anomalies []model.Anomaly) error {
	if anomalies == nil {
		anomalies = []model.Anomaly{}
	}
	_, err := tx.Exec(ctx, `INSERT INTO staged_txn (job_id, org_id, position, description, amount, direction, category_id,
		ai_categorized, is_duplicate, txn_date, anomalies) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (job_id, position) DO NOTHING`,
		jobID, orgID, position, s.Description, s.Amount, s.Direction, s.CategoryID, s.AICategorized, s.IsDuplicate, s.TxnDate, mustJSON(anomalies))
	return err
}

const stagedCols = `id, job_id, description, amount, direction, category_id, ai_categorized, is_duplicate, include_duplicate, to_char(txn_date, 'YYYY-MM-DD')`

func scanStaged(row pgx.Row) (*model.StagedTxn, error) {
	var s model.StagedTxn
	if err := row.Scan(&s.ID, &s.JobID, &s.Description, &s.Amount, &s.Direction, &s.CategoryID, &s.AICategorized,
		&s.IsDuplicate, &s.IncludeDuplicate, &s.TxnDate); err != nil {
		return nil, translate(err)
	}
	return &s, nil
}

func ListStaged(ctx context.Context, tx pgx.Tx, jobID string) ([]model.StagedTxn, error) {
	rows, err := tx.Query(ctx, `SELECT `+stagedCols+` FROM staged_txn WHERE job_id = $1 ORDER BY position`, jobID)
	if err != nil {
		return nil, err
	}
	return collect(rows, scanStaged)
}

func GetStaged(ctx context.Context, tx pgx.Tx, id string) (*model.StagedTxn, error) {
	return scanStaged(tx.QueryRow(ctx, `SELECT `+stagedCols+` FROM staged_txn WHERE id = $1`, id))
}

func SetStagedCategory(ctx context.Context, tx pgx.Tx, id, categoryID string) (*model.StagedTxn, error) {
	return scanStaged(tx.QueryRow(ctx, `UPDATE staged_txn SET category_id = $2, ai_categorized = false WHERE id = $1 RETURNING `+stagedCols, id, categoryID))
}

func SetStagedInclude(ctx context.Context, tx pgx.Tx, id string, include bool) (*model.StagedTxn, error) {
	return scanStaged(tx.QueryRow(ctx, `UPDATE staged_txn SET include_duplicate = $2 WHERE id = $1 RETURNING `+stagedCols, id, include))
}

// ConfirmImport moves every non-duplicate (or re-included) staged row into
// the ledger in one statement: all or nothing (flows/import.md §2).
func ConfirmImport(ctx context.Context, tx pgx.Tx, job *model.ImportJob) (imported, discarded int, err error) {
	source := "csv"
	if job.Source == "bank_sync" {
		source = "bank"
	} else if job.FileType != nil {
		source = map[string]string{"csv": "csv", "xlsx": "csv", "pdf": "pdf", "image": "receipt"}[*job.FileType]
	}
	tag, err := tx.Exec(ctx, `INSERT INTO ledger_txn (org_id, description, amount, direction, category_id, txn_date, source,
			import_job_id, ai_categorized, anomalies)
		SELECT org_id, description, amount, direction, category_id, txn_date, $2, job_id, ai_categorized, anomalies
		FROM staged_txn WHERE job_id = $1 AND (NOT is_duplicate OR include_duplicate) ORDER BY position`, job.ID, source)
	if err != nil {
		return 0, 0, err
	}
	var total int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM staged_txn WHERE job_id = $1`, job.ID).Scan(&total); err != nil {
		return 0, 0, err
	}
	imported = int(tag.RowsAffected())
	_, err = tx.Exec(ctx, `UPDATE import_job SET confirmed = true, confirmed_at = now(), imported = $2 WHERE id = $1`, job.ID, imported)
	return imported, total - imported, err
}

func DeleteImportJob(ctx context.Context, tx pgx.Tx, id string) error {
	tag, err := tx.Exec(ctx, `DELETE FROM import_job WHERE id = $1`, id)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

// ── Reference data for import.ready (system-design.md §6.1) ────────────

type RefCategory struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
}

type RefRow struct {
	TxnDate     string  `json:"txn_date"`
	Amount      float64 `json:"amount"`
	Direction   string  `json:"direction"`
	Description string  `json:"description"`
}

type CategoryMean struct {
	Mean  float64 `json:"mean"`
	Count int     `json:"count"`
}

type Aggregates struct {
	Median90d       map[string]float64      `json:"median_90d"`
	CategoryMonthly map[string][]float64    `json:"category_monthly"`
	CategoryMean    map[string]CategoryMean `json:"category_mean"`
}

type Reference struct {
	Categories []RefCategory `json:"categories"`
	Ledger     []RefRow      `json:"ledger"`
	Aggregates Aggregates    `json:"aggregates"`
}

// LedgerLookback bounds the duplicate reference. The statement's own date
// range isn't known until analytics parses it, so common sends a fixed
// window; larger payloads travel by reference (S-3).
const LedgerLookback = 400 * 24 * time.Hour

func ImportReference(ctx context.Context, tx pgx.Tx, jobID string) (*Reference, error) {
	ref := &Reference{Aggregates: Aggregates{
		Median90d:       map[string]float64{"income": 0, "expense": 0},
		CategoryMonthly: map[string][]float64{},
		CategoryMean:    map[string]CategoryMean{},
	}}
	rows, err := tx.Query(ctx, `SELECT id, name, type FROM category WHERE archived_at IS NULL ORDER BY name`)
	if err != nil {
		return nil, err
	}
	if ref.Categories, err = collect(rows, func(r pgx.Row) (*RefCategory, error) {
		var c RefCategory
		return &c, r.Scan(&c.ID, &c.Name, &c.Type)
	}); err != nil {
		return nil, err
	}

	since := time.Now().Add(-LedgerLookback).Format("2006-01-02")
	rows, err = tx.Query(ctx, `SELECT to_char(txn_date, 'YYYY-MM-DD'), amount::float8, direction, description FROM ledger_txn WHERE txn_date >= $1
		UNION ALL
		SELECT to_char(s.txn_date, 'YYYY-MM-DD'), s.amount::float8, s.direction, s.description FROM staged_txn s
		JOIN import_job j ON j.id = s.job_id WHERE s.job_id <> $2 AND NOT j.confirmed AND s.txn_date >= $1`, since, jobID)
	if err != nil {
		return nil, err
	}
	if ref.Ledger, err = collect(rows, func(r pgx.Row) (*RefRow, error) {
		var x RefRow
		return &x, r.Scan(&x.TxnDate, &x.Amount, &x.Direction, &x.Description)
	}); err != nil {
		return nil, err
	}

	rows, err = tx.Query(ctx, `SELECT direction, percentile_cont(0.5) WITHIN GROUP (ORDER BY amount)::float8 FROM ledger_txn
		WHERE txn_date >= current_date - 90 GROUP BY direction`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var dir string
		var median float64
		if err := rows.Scan(&dir, &median); err != nil {
			rows.Close()
			return nil, err
		}
		ref.Aggregates.Median90d[dir] = median
	}
	rows.Close()

	// Trailing 6 complete months of expense totals per category, oldest first.
	rows, err = tx.Query(ctx, `SELECT c.name, array_agg(coalesce(t.total, 0)::float8 ORDER BY m.month)
		FROM category c
		CROSS JOIN generate_series(date_trunc('month', now()) - interval '6 months', date_trunc('month', now()) - interval '1 month', interval '1 month') AS m(month)
		LEFT JOIN (SELECT category_id, date_trunc('month', txn_date) AS month, sum(amount) AS total FROM ledger_txn
			WHERE direction = 'expense' GROUP BY 1, 2) t ON t.category_id = c.id AND t.month = m.month
		WHERE c.type = 'expense' AND EXISTS (SELECT 1 FROM ledger_txn x WHERE x.category_id = c.id)
		GROUP BY c.name`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var name string
		var totals []float64
		if err := rows.Scan(&name, &totals); err != nil {
			rows.Close()
			return nil, err
		}
		ref.Aggregates.CategoryMonthly[name] = totals
	}
	rows.Close()

	rows, err = tx.Query(ctx, `SELECT c.name, avg(t.amount)::float8, count(*) FROM ledger_txn t JOIN category c ON c.id = t.category_id
		WHERE t.direction = 'expense' GROUP BY c.name`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var name string
		var m CategoryMean
		if err := rows.Scan(&name, &m.Mean, &m.Count); err != nil {
			rows.Close()
			return nil, err
		}
		ref.Aggregates.CategoryMean[name] = m
	}
	rows.Close()
	return ref, rows.Err()
}

// ── Tickets ─────────────────────────────────────────────────────────────

func InsertTicket(ctx context.Context, tx pgx.Tx, t model.UploadTicket) error {
	_, err := tx.Exec(ctx, `INSERT INTO upload_ticket (jti, org_id, target_kind, target_id, file_type, max_bytes, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`, t.JTI, t.OrgID, t.TargetKind, t.TargetID, t.FileType, t.MaxBytes, t.ExpiresAt)
	return err
}

// UseTicket marks the ticket used and returns it; ErrNotFound when it is
// unknown, already used, or expired (single use, S-5).
func UseTicket(ctx context.Context, tx pgx.Tx, jti string) (*model.UploadTicket, error) {
	var t model.UploadTicket
	err := tx.QueryRow(ctx, `UPDATE upload_ticket SET used_at = now()
		WHERE jti = $1 AND used_at IS NULL AND expires_at > now() - interval '30 seconds'
		RETURNING jti, org_id, target_kind, target_id, file_type, max_bytes, expires_at, used_at`, jti).
		Scan(&t.JTI, &t.OrgID, &t.TargetKind, &t.TargetID, &t.FileType, &t.MaxBytes, &t.ExpiresAt, &t.UsedAt)
	return &t, translate(err)
}
