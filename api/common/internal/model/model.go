// Package model holds the API and storage shapes. JSON names mirror the web
// contract (web/src/models, snake_case).
package model

import (
	"encoding/json"
	"time"
)

type User struct {
	ID          string    `json:"id"`
	FirebaseUID string    `json:"-"`
	Email       string    `json:"email"`
	Name        string    `json:"name"`
	CreatedAt   time.Time `json:"created_at"`
}

type Address struct {
	Line1   string `json:"line1"`
	Line2   string `json:"line2,omitempty"`
	City    string `json:"city"`
	State   string `json:"state"`
	Country string `json:"country"`
}

type Org struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Kind              string    `json:"kind"`
	Currency          string    `json:"currency"`
	Country           string    `json:"country"`
	FiscalYearEnd     string    `json:"fiscal_year_end"`
	RegisteredAddress *Address  `json:"registered_address,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	DataVersion       int64     `json:"-"`
}

type Role string

const (
	RoleMember Role = "member"
	RoleAdmin  Role = "admin"
	RoleOwner  Role = "owner"
)

// AtLeast reports whether r grants at least min (member < admin < owner).
func (r Role) AtLeast(min Role) bool {
	rank := map[Role]int{RoleMember: 1, RoleAdmin: 2, RoleOwner: 3}
	return rank[r] >= rank[min]
}

type Member struct {
	OrgID    string     `json:"org_id"`
	UserID   *string    `json:"user_id"`
	Name     string     `json:"name"`
	Email    string     `json:"email"`
	Role     Role       `json:"role"`
	Status   string     `json:"status"`
	JoinedAt *time.Time `json:"joined_at"`
}

type Consent struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Document   string    `json:"document"`
	Version    string    `json:"version"`
	AcceptedAt time.Time `json:"accepted_at"`
}

type Category struct {
	ID           string     `json:"id"`
	OrgID        string     `json:"org_id"`
	Name         string     `json:"name"`
	Type         string     `json:"type"`
	Color        string     `json:"color"`
	TaxTreatment string     `json:"tax_treatment"`
	VATTreatment string     `json:"vat_treatment"`
	VATBasis     string     `json:"vat_basis"`
	AIProposed   bool       `json:"ai_proposed"`
	AINote       *string    `json:"ai_note"`
	TxnCountYTD  int        `json:"txn_count_ytd"`
	ArchivedAt   *time.Time `json:"archived_at"`
}

type Anomaly struct {
	RuleID      string `json:"rule_id"`
	Severity    string `json:"severity"`
	Note        string `json:"note"`
	DetectedAt  string `json:"detected_at,omitempty"`
	RuleVersion string `json:"rule_version,omitempty"`
}

type Txn struct {
	ID                  string    `json:"id"`
	OrgID               string    `json:"org_id"`
	Description         string    `json:"description"`
	Amount              float64   `json:"amount"`
	Direction           string    `json:"direction"`
	CategoryID          string    `json:"category_id"`
	TxnDate             string    `json:"txn_date"`
	Source              string    `json:"source"`
	SourceLinkID        *string   `json:"source_link_id"`
	AICategorized       bool      `json:"ai_categorized"`
	ExcludedFromReports bool      `json:"excluded_from_reports"`
	Anomalies           []Anomaly `json:"anomalies"`
	CreatedAt           time.Time `json:"created_at"`
}

type Page[T any] struct {
	Items      []T     `json:"items"`
	NextCursor *string `json:"next_cursor"`
}

type ImportSummary struct {
	TotalIncome  float64            `json:"total_income"`
	TotalExpense float64            `json:"total_expense"`
	Net          float64            `json:"net"`
	ByCategory   map[string]float64 `json:"by_category"`
}

type ImportJob struct {
	ID              string          `json:"id"`
	OrgID           string          `json:"org_id"`
	Source          string          `json:"source"`
	Status          string          `json:"status"`
	FileName        *string         `json:"file_name"`
	FileType        *string         `json:"file_type"`
	TotalParsed     int             `json:"total_parsed"`
	DuplicatesFound int             `json:"duplicates_found"`
	Imported        int             `json:"imported"`
	Summary         *ImportSummary  `json:"summary"`
	AISummary       *string         `json:"ai_summary"`
	Anomalies       []Anomaly       `json:"anomalies"`
	Warnings        []string        `json:"warnings"`
	ErrorCode       *string         `json:"error_code"`
	Confirmed       bool            `json:"confirmed"`
	CreatedAt       time.Time       `json:"created_at"`
	CompletedAt     *time.Time      `json:"completed_at"`
	CreatedBy       *string         `json:"-"`
	ObjectKey       *string         `json:"-"`
	Raw             json.RawMessage `json:"-"`
}

type StagedTxn struct {
	ID               string  `json:"id"`
	JobID            string  `json:"job_id"`
	Description      string  `json:"description"`
	Amount           float64 `json:"amount"`
	Direction        string  `json:"direction"`
	CategoryID       string  `json:"category_id"`
	AICategorized    bool    `json:"ai_categorized"`
	IsDuplicate      bool    `json:"is_duplicate"`
	IncludeDuplicate bool    `json:"include_duplicate"`
	TxnDate          string  `json:"txn_date"`
}

type UploadTicket struct {
	JTI        string
	OrgID      string
	TargetKind string
	TargetID   string
	FileType   string
	MaxBytes   int64
	ExpiresAt  time.Time
	UsedAt     *time.Time
}
