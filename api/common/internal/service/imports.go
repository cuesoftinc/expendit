package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/middleware"
	"github.com/cuesoftinc/expendit/api/common/internal/model"
	"github.com/cuesoftinc/expendit/api/common/internal/ratelimit"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/storage"
	"github.com/cuesoftinc/expendit/api/common/internal/ticket"
)

type Imports struct {
	DB       *repository.DB
	Tickets  *ticket.Signer
	Limiter  *ratelimit.Limiter
	Store    storage.Store
	MaxBytes int64
	PerHour  int
	PerDay   int
	BytesDay int64
	Now      func() time.Time
}

type CreateImport struct {
	FileName string `json:"file_name"`
	FileType string `json:"file_type"`
	Size     int64  `json:"size"`
}

type ImportCreated struct {
	ID           string `json:"id"`
	JobID        string `json:"job_id"`
	UploadTicket string `json:"upload_ticket"`
	ExpiresAt    string `json:"expires_at"`
	MaxBytes     int64  `json:"max_bytes"`
}

// Create authorizes an upload before any bytes move (§6.1, S-5): role,
// ai_processing consent for types that need AI, rate limits and the daily
// byte quota. Then it creates the job (awaiting_upload) and a ticket.
func (s *Imports) Create(ctx context.Context, p *middleware.Principal, in CreateImport, idemKey string) (*ImportCreated, error) {
	in.FileType = strings.ToLower(strings.TrimSpace(in.FileType))
	if !oneOf(in.FileType, "csv", "xlsx", "pdf", "image") {
		return nil, newErr(http.StatusUnsupportedMediaType, "unsupported_type", "Upload a CSV, PDF, or receipt image")
	}
	if in.Size <= 0 {
		return nil, invalid("size is required", map[string]any{"size": "bytes, > 0"})
	}
	if in.Size > s.MaxBytes {
		return nil, &Error{Status: http.StatusRequestEntityTooLarge, Code: "file_too_large",
			Message: fmt.Sprintf("Files can be at most %d MB", s.MaxBytes>>20), Details: map[string]any{"max_bytes": s.MaxBytes}}
	}
	var key *string
	if idemKey = strings.TrimSpace(idemKey); idemKey != "" {
		if len(idemKey) > 128 {
			return nil, invalid("Idempotency-Key is too long", nil)
		}
		key = &idemKey
	}

	// E-3: images always need AI; PDFs fall back to regex without it.
	if in.FileType == "image" {
		var consented bool
		if err := s.DB.AsSystem(ctx, func(tx pgx.Tx) (err error) {
			consented, err = repository.HasAIConsent(ctx, tx, p.UserID)
			return err
		}); err != nil {
			return nil, err
		}
		if !consented {
			return nil, newErr(http.StatusForbidden, "consent_required", "Allow AI processing to import receipt images")
		}
	}

	var job *model.ImportJob
	var existing bool
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		job, existing, err = repository.CreateImportJob(ctx, tx, p.OrgID, p.UserID, in.FileName, in.FileType, in.Size, key)
		return err
	})
	if err != nil {
		return nil, err
	}
	if existing && job.Status != "awaiting_upload" {
		// Same key, job already uploaded: the retry gets the same job, and
		// no new ticket (flows/import.md §2).
		return &ImportCreated{ID: job.ID, JobID: job.ID}, nil
	}

	if !existing {
		if ok, wait := s.Limiter.Take(ctx, "org:"+p.OrgID, 1,
			ratelimit.Rule{Name: "uploads-hour", Max: int64(s.PerHour), Window: time.Hour},
			ratelimit.Rule{Name: "uploads-day", Max: int64(s.PerDay), Window: 24 * time.Hour}); !ok {
			_ = s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error { return repository.DeleteImportJob(ctx, tx, job.ID) })
			return nil, &Error{Status: http.StatusTooManyRequests, Code: "rate_limited", Message: "Too many uploads; try again later", RetryAfter: wait}
		}
		if ok, wait := s.Limiter.Take(ctx, "org:"+p.OrgID, in.Size,
			ratelimit.Rule{Name: "upload-bytes-day", Max: s.BytesDay, Window: 24 * time.Hour}); !ok {
			_ = s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error { return repository.DeleteImportJob(ctx, tx, job.ID) })
			return nil, &Error{Status: http.StatusTooManyRequests, Code: "quota_exceeded", Message: "Today's upload allowance is used up", RetryAfter: wait}
		}
	}

	now := s.Now()
	encoded, claims := s.Tickets.Issue(p.OrgID, ticket.Target{Kind: "import_job", ID: job.ID}, in.FileType, s.MaxBytes, now)
	err = s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		return repository.InsertTicket(ctx, tx, model.UploadTicket{JTI: claims.JTI, OrgID: p.OrgID, TargetKind: "import_job",
			TargetID: job.ID, FileType: in.FileType, MaxBytes: s.MaxBytes, ExpiresAt: time.Unix(claims.EXP, 0)})
	})
	if err != nil {
		return nil, err
	}
	return &ImportCreated{ID: job.ID, JobID: job.ID, UploadTicket: encoded, ExpiresAt: time.Unix(claims.EXP, 0).UTC().Format(time.RFC3339), MaxBytes: s.MaxBytes}, nil
}

func (s *Imports) List(ctx context.Context, p *middleware.Principal) ([]model.ImportJob, error) {
	var jobs []model.ImportJob
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		jobs, err = repository.ListImportJobs(ctx, tx)
		return err
	})
	return jobs, err
}

type ImportDetail struct {
	Job    *model.ImportJob  `json:"job"`
	Staged []model.StagedTxn `json:"staged"`
}

func (s *Imports) Get(ctx context.Context, p *middleware.Principal, id string) (*ImportDetail, error) {
	d := &ImportDetail{}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) (err error) {
		if d.Job, err = repository.GetImportJob(ctx, tx, id); err != nil {
			return err
		}
		d.Staged, err = repository.ListStaged(ctx, tx, id)
		return err
	})
	return d, err
}

// canManage: members act on their own jobs; admins on any (engineering.md §2).
func canManage(p *middleware.Principal, job *model.ImportJob) bool {
	return p.Role.AtLeast(model.RoleAdmin) || (job.CreatedBy != nil && *job.CreatedBy == p.UserID)
}

func (s *Imports) staged(ctx context.Context, tx pgx.Tx, p *middleware.Principal, stagedID string) (*model.StagedTxn, error) {
	st, err := repository.GetStaged(ctx, tx, stagedID)
	if err != nil {
		return nil, err
	}
	job, err := repository.GetImportJob(ctx, tx, st.JobID)
	if err != nil {
		return nil, err
	}
	if !canManage(p, job) {
		return nil, ErrForbidden
	}
	if job.Confirmed {
		return nil, newErr(http.StatusConflict, "job_already_confirmed", "This import was already confirmed")
	}
	return st, nil
}

func (s *Imports) SetCategory(ctx context.Context, p *middleware.Principal, stagedID, categoryID string) (*model.StagedTxn, error) {
	var out *model.StagedTxn
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		st, err := s.staged(ctx, tx, p, stagedID)
		if err != nil {
			return err
		}
		if err := checkCategory(ctx, tx, &model.Txn{CategoryID: categoryID, Direction: st.Direction}); err != nil {
			return err
		}
		out, err = repository.SetStagedCategory(ctx, tx, stagedID, categoryID)
		return err
	})
	return out, err
}

func (s *Imports) SetInclude(ctx context.Context, p *middleware.Principal, stagedID string, include bool) (*model.StagedTxn, error) {
	var out *model.StagedTxn
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		if _, err := s.staged(ctx, tx, p, stagedID); err != nil {
			return err
		}
		var err error
		out, err = repository.SetStagedInclude(ctx, tx, stagedID, include)
		return err
	})
	return out, err
}

type ConfirmResult struct {
	Imported  int `json:"imported"`
	Discarded int `json:"discarded"`
}

// Confirm writes the ledger rows atomically; a second call is a no-op 200
// (flows/import.md §2).
func (s *Imports) Confirm(ctx context.Context, p *middleware.Principal, id string) (*ConfirmResult, error) {
	res := &ConfirmResult{}
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		job, err := repository.LockImportJob(ctx, tx, id)
		if err != nil {
			return err
		}
		if !canManage(p, job) {
			return ErrForbidden
		}
		if job.Confirmed {
			res.Imported = job.Imported
			return nil
		}
		if job.Status != "completed" {
			return newErr(http.StatusConflict, "job_not_ready", "This import is still processing")
		}
		if res.Imported, res.Discarded, err = repository.ConfirmImport(ctx, tx, job); err != nil {
			return err
		}
		_, err = repository.BumpDataVersion(ctx, tx, p.OrgID)
		return err
	})
	return res, err
}

// Discard purges the job and its staging immediately (flows/import.md §2).
func (s *Imports) Discard(ctx context.Context, p *middleware.Principal, id string) error {
	var objectKey *string
	err := s.DB.InOrg(ctx, p.OrgID, func(tx pgx.Tx) error {
		job, err := repository.LockImportJob(ctx, tx, id)
		if err != nil {
			return err
		}
		if !canManage(p, job) {
			return ErrForbidden
		}
		if job.Confirmed {
			return newErr(http.StatusConflict, "job_already_confirmed", "Confirmed imports live in the ledger now")
		}
		objectKey = job.ObjectKey
		return repository.DeleteImportJob(ctx, tx, id)
	})
	if err == nil && objectKey != nil {
		s.deleteObject(ctx, *objectKey)
	}
	return err
}

func (s *Imports) deleteObject(ctx context.Context, key string) {
	if err := s.Store.Delete(ctx, key); err != nil {
		// The tmp/ sweep removes it within 15 minutes.
		slog.Warn("tmp object delete failed", "error", err)
	}
}

// ── Consumers ───────────────────────────────────────────────────────────

type uploadReceived struct {
	TicketID string          `json:"ticket_id"`
	OrgID    string          `json:"org_id"`
	Target   ticket.Target   `json:"target"`
	FileName string          `json:"file_name"`
	FileType string          `json:"file_type"`
	Object   kafka.ObjectRef `json:"object"`
}

// OnUploadReceived marks the ticket used, moves the job to processing and
// queues import.ready with its reference data, in one transaction.
// Statements' uploads are routed to the statements service.
func (s *Imports) OnUploadReceived(ctx context.Context, raw json.RawMessage, statements func(context.Context, pgx.Tx, uploadReceived) error) error {
	var msg uploadReceived
	if err := json.Unmarshal(raw, &msg); err != nil {
		return nil // validated against the schema already; unreachable
	}
	discard := false
	err := s.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		t, err := repository.UseTicket(ctx, tx, msg.TicketID)
		if err == repository.ErrNotFound || (err == nil && (t.OrgID != msg.OrgID || t.TargetID != msg.Target.ID || t.TargetKind != msg.Target.Kind)) {
			// Replayed, expired or mismatched: drop it and its bytes.
			discard = true
			return nil
		} else if err != nil {
			return err
		}
		if err := repository.Narrow(ctx, tx, t.OrgID); err != nil {
			return err
		}
		if t.TargetKind == "fin_statement" {
			return statements(ctx, tx, msg)
		}
		job, err := repository.LockImportJob(ctx, tx, t.TargetID)
		if err == repository.ErrNotFound || (err == nil && job.Status != "awaiting_upload") {
			discard = true
			return nil
		} else if err != nil {
			return err
		}
		if err := repository.StartImportProcessing(ctx, tx, job.ID, msg.Object.Key, msg.FileName, msg.FileType); err != nil {
			return err
		}
		return s.enqueueReady(ctx, tx, job, msg)
	})
	if err == nil && discard {
		slog.Info("upload discarded", "ticket", msg.TicketID)
		s.deleteObject(ctx, msg.Object.Key)
	}
	return err
}

func (s *Imports) enqueueReady(ctx context.Context, tx pgx.Tx, job *model.ImportJob, msg uploadReceived) error {
	org, err := repository.GetOrg(ctx, tx, job.OrgID)
	if err != nil {
		return err
	}
	ref, err := repository.ImportReference(ctx, tx, job.ID)
	if err != nil {
		return err
	}
	aiAllowed := false
	if job.CreatedBy != nil {
		if aiAllowed, err = repository.HasAIConsent(ctx, tx, *job.CreatedBy); err != nil {
			return err
		}
	}
	return repository.Enqueue(ctx, tx, kafka.TopicImportReady, job.ID, map[string]any{
		"job_id":     job.ID,
		"org_id":     job.OrgID,
		"source":     "upload",
		"file_name":  msg.FileName,
		"file_type":  msg.FileType,
		"file":       msg.Object,
		"ai_allowed": aiAllowed,
		"currency":   org.Currency,
		"reference":  ref,
	})
}

type processedTxn struct {
	TxnDate       string  `json:"txn_date"`
	Amount        float64 `json:"amount"`
	Direction     string  `json:"direction"`
	Description   string  `json:"description"`
	CategoryID    string  `json:"category_id"`
	CategoryName  string  `json:"category_name"`
	AICategorized bool    `json:"ai_categorized"`
	IsDuplicate   bool    `json:"is_duplicate"`
}

type processedAnomaly struct {
	model.Anomaly
	TxnIndex *int `json:"txn_index"`
}

type importProcessed struct {
	JobID           string               `json:"job_id"`
	OrgID           string               `json:"org_id"`
	Status          string               `json:"status"`
	ErrorCode       *string              `json:"error_code"`
	FileType        *string              `json:"file_type"`
	TotalParsed     int                  `json:"total_parsed"`
	DuplicatesFound int                  `json:"duplicates_found"`
	Transactions    []processedTxn       `json:"transactions"`
	Summary         *model.ImportSummary `json:"summary"`
	AISummary       *string              `json:"ai_summary"`
	Anomalies       []processedAnomaly   `json:"anomalies"`
	Warnings        []string             `json:"warnings"`
}

// OnImportProcessed stores analytics' decisions exactly as made, then
// deletes the raw file (S-4). Idempotent: a job that is no longer
// processing ignores the redelivery.
func (s *Imports) OnImportProcessed(ctx context.Context, raw json.RawMessage) error {
	var msg importProcessed
	if err := json.Unmarshal(raw, &msg); err != nil {
		return nil
	}
	var objectKey *string
	err := s.DB.InOrg(ctx, msg.OrgID, func(tx pgx.Tx) error {
		job, err := repository.LockImportJob(ctx, tx, msg.JobID)
		if err == repository.ErrNotFound {
			return nil // discarded meanwhile
		} else if err != nil {
			return err
		}
		objectKey = job.ObjectKey
		if job.Status != "processing" {
			return nil
		}
		if msg.Status == "failed" {
			code := "processing_error"
			if msg.ErrorCode != nil {
				code = *msg.ErrorCode
			}
			return repository.FailImport(ctx, tx, job.ID, code)
		}

		detected := time.Now().UTC().Format("2006-01-02")
		rowAnomalies := map[int][]model.Anomaly{}
		jobAnomalies := []model.Anomaly{}
		for _, a := range msg.Anomalies {
			a.DetectedAt = detected
			if a.TxnIndex != nil {
				rowAnomalies[*a.TxnIndex] = append(rowAnomalies[*a.TxnIndex], a.Anomaly)
			}
			jobAnomalies = append(jobAnomalies, a.Anomaly)
		}
		for i, t := range msg.Transactions {
			categoryID := t.CategoryID
			if categoryID == "" {
				if categoryID, err = repository.EnsureCategory(ctx, tx, msg.OrgID, t.CategoryName, t.Direction); err != nil {
					return err
				}
			}
			err := repository.InsertStaged(ctx, tx, msg.OrgID, job.ID, i, model.StagedTxn{
				Description: t.Description, Amount: t.Amount, Direction: t.Direction, CategoryID: categoryID,
				AICategorized: t.AICategorized, IsDuplicate: t.IsDuplicate, TxnDate: t.TxnDate,
			}, rowAnomalies[i])
			if err != nil {
				return err
			}
		}
		return repository.CompleteImport(ctx, tx, job.ID, repository.ImportResult{
			Status: "completed", FileType: msg.FileType, TotalParsed: msg.TotalParsed, DuplicatesFound: msg.DuplicatesFound,
			Summary: msg.Summary, AISummary: msg.AISummary, Anomalies: jobAnomalies, Warnings: msg.Warnings,
		})
	})
	if err == nil && objectKey != nil {
		s.deleteObject(ctx, *objectKey)
	}
	return err
}
