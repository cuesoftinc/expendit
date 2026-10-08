package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/model"
)

const userCols = `id, firebase_uid, email, name, created_at`

func scanUser(row pgx.Row) (*model.User, error) {
	var u model.User
	if err := row.Scan(&u.ID, &u.FirebaseUID, &u.Email, &u.Name, &u.CreatedAt); err != nil {
		return nil, translate(err)
	}
	return &u, nil
}

// UpsertUser finds the user by Firebase uid, else links a row by verified
// email, else creates one (data-model.md §3). created reports a new row.
func UpsertUser(ctx context.Context, tx pgx.Tx, uid, email, name string) (u *model.User, created bool, err error) {
	if u, err = scanUser(tx.QueryRow(ctx, `SELECT `+userCols+` FROM app_user WHERE firebase_uid = $1`, uid)); err == nil {
		return u, false, nil
	} else if err != ErrNotFound {
		return nil, false, err
	}
	if u, err = scanUser(tx.QueryRow(ctx,
		`UPDATE app_user SET firebase_uid = $1 WHERE lower(email) = lower($2) RETURNING `+userCols, uid, email)); err == nil {
		return u, false, nil
	} else if err != ErrNotFound {
		return nil, false, err
	}
	u, err = scanUser(tx.QueryRow(ctx,
		`INSERT INTO app_user (firebase_uid, email, name) VALUES ($1, $2, $3) RETURNING `+userCols, uid, email, name))
	return u, err == nil, err
}

// ClaimInvites activates pending email invites on the user's first sign-in.
func ClaimInvites(ctx context.Context, tx pgx.Tx, userID, email string) error {
	_, err := tx.Exec(ctx, `UPDATE org_member SET user_id = $1, status = 'active', joined_at = now()
		WHERE user_id IS NULL AND status = 'pending' AND lower(email) = lower($2)`, userID, email)
	return err
}

const orgCols = `id, name, kind, currency, country, fiscal_year_end, registered_address, created_at, data_version`

func scanOrg(row pgx.Row) (*model.Org, error) {
	var o model.Org
	var addr []byte
	if err := row.Scan(&o.ID, &o.Name, &o.Kind, &o.Currency, &o.Country, &o.FiscalYearEnd, &addr, &o.CreatedAt, &o.DataVersion); err != nil {
		return nil, translate(err)
	}
	if len(addr) > 0 {
		o.RegisteredAddress = &model.Address{}
		if err := json.Unmarshal(addr, o.RegisteredAddress); err != nil {
			return nil, err
		}
	}
	return &o, nil
}

func CreateOrg(ctx context.Context, tx pgx.Tx, o model.Org) (*model.Org, error) {
	return scanOrg(tx.QueryRow(ctx, `INSERT INTO org (name, kind, currency, country, fiscal_year_end, registered_address)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+orgCols,
		o.Name, o.Kind, o.Currency, o.Country, o.FiscalYearEnd, jsonOrNil(o.RegisteredAddress)))
}

func GetOrg(ctx context.Context, tx pgx.Tx, id string) (*model.Org, error) {
	return scanOrg(tx.QueryRow(ctx, `SELECT `+orgCols+` FROM org WHERE id = $1`, id))
}

func UpdateOrg(ctx context.Context, tx pgx.Tx, o model.Org) (*model.Org, error) {
	return scanOrg(tx.QueryRow(ctx, `UPDATE org SET name = $2, fiscal_year_end = $3, registered_address = $4
		WHERE id = $1 RETURNING `+orgCols, o.ID, o.Name, o.FiscalYearEnd, jsonOrNil(o.RegisteredAddress)))
}

// BumpDataVersion marks every computed figure of the org stale (§6.5).
func BumpDataVersion(ctx context.Context, tx pgx.Tx, orgID string) (int64, error) {
	var v int64
	err := tx.QueryRow(ctx, `UPDATE org SET data_version = data_version + 1 WHERE id = $1 RETURNING data_version`, orgID).Scan(&v)
	return v, translate(err)
}

// OrgsForUser lists active memberships with their role (system scope).
func OrgsForUser(ctx context.Context, tx pgx.Tx, userID string) ([]model.Org, error) {
	rows, err := tx.Query(ctx, `SELECT `+prefixed("o.", orgCols)+` FROM org o
		JOIN org_member m ON m.org_id = o.id WHERE m.user_id = $1 AND m.status = 'active' ORDER BY o.kind DESC, o.created_at`, userID)
	if err != nil {
		return nil, err
	}
	return collect(rows, scanOrg)
}

// MemberRole returns the user's role in the org, or ErrNotFound.
func MemberRole(ctx context.Context, tx pgx.Tx, orgID, userID string) (model.Role, error) {
	var role model.Role
	err := tx.QueryRow(ctx, `SELECT role FROM org_member WHERE org_id = $1 AND user_id = $2 AND status = 'active'`, orgID, userID).Scan(&role)
	return role, translate(err)
}

// PersonalOrgID returns the user's personal org (they own exactly one).
func PersonalOrgID(ctx context.Context, tx pgx.Tx, userID string) (string, error) {
	var id string
	err := tx.QueryRow(ctx, `SELECT o.id FROM org o JOIN org_member m ON m.org_id = o.id
		WHERE m.user_id = $1 AND m.role = 'owner' AND o.kind = 'personal' ORDER BY o.created_at LIMIT 1`, userID).Scan(&id)
	return id, translate(err)
}

const memberCols = `m.org_id, m.user_id, coalesce(u.name, ''), m.email, m.role, m.status, m.joined_at`

func scanMember(row pgx.Row) (*model.Member, error) {
	var m model.Member
	if err := row.Scan(&m.OrgID, &m.UserID, &m.Name, &m.Email, &m.Role, &m.Status, &m.JoinedAt); err != nil {
		return nil, translate(err)
	}
	return &m, nil
}

func AddMember(ctx context.Context, tx pgx.Tx, orgID string, userID *string, email string, role model.Role) (*model.Member, error) {
	status := "pending"
	if userID != nil {
		status = "active"
	}
	var id string
	if err := tx.QueryRow(ctx, `INSERT INTO org_member (org_id, user_id, email, role, status, joined_at)
		VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 = 'active' THEN now() END) RETURNING id`,
		orgID, userID, email, role, status).Scan(&id); err != nil {
		return nil, translate(err)
	}
	return scanMember(tx.QueryRow(ctx, `SELECT `+memberCols+` FROM org_member m LEFT JOIN app_user u ON u.id = m.user_id WHERE m.id = $1`, id))
}

func ListMembers(ctx context.Context, tx pgx.Tx, orgID string) ([]model.Member, error) {
	rows, err := tx.Query(ctx, `SELECT `+memberCols+` FROM org_member m LEFT JOIN app_user u ON u.id = m.user_id
		WHERE m.org_id = $1 ORDER BY m.created_at`, orgID)
	if err != nil {
		return nil, err
	}
	return collect(rows, scanMember)
}

func SetMemberRole(ctx context.Context, tx pgx.Tx, orgID, userID string, role model.Role) (*model.Member, error) {
	if _, err := tx.Exec(ctx, `UPDATE org_member SET role = $3 WHERE org_id = $1 AND user_id = $2`, orgID, userID, role); err != nil {
		return nil, err
	}
	return scanMember(tx.QueryRow(ctx, `SELECT `+memberCols+` FROM org_member m LEFT JOIN app_user u ON u.id = m.user_id
		WHERE m.org_id = $1 AND m.user_id = $2`, orgID, userID))
}

func RemoveMember(ctx context.Context, tx pgx.Tx, orgID, userID string) error {
	tag, err := tx.Exec(ctx, `DELETE FROM org_member WHERE org_id = $1 AND user_id = $2`, orgID, userID)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

func CountOwners(ctx context.Context, tx pgx.Tx, orgID string) (int, error) {
	var n int
	err := tx.QueryRow(ctx, `SELECT count(*) FROM org_member WHERE org_id = $1 AND role = 'owner' AND status = 'active'`, orgID).Scan(&n)
	return n, err
}

func FindUserByEmail(ctx context.Context, tx pgx.Tx, email string) (*model.User, error) {
	return scanUser(tx.QueryRow(ctx, `SELECT `+userCols+` FROM app_user WHERE lower(email) = lower($1)`, email))
}

// ── Consent ─────────────────────────────────────────────────────────────

func RecordConsent(ctx context.Context, tx pgx.Tx, userID, document, version string) (*model.Consent, error) {
	var c model.Consent
	err := tx.QueryRow(ctx, `INSERT INTO consent_record (user_id, document, version) VALUES ($1, $2, $3)
		RETURNING id, user_id, document, version, accepted_at`, userID, document, version).
		Scan(&c.ID, &c.UserID, &c.Document, &c.Version, &c.AcceptedAt)
	return &c, translate(err)
}

func ListConsents(ctx context.Context, tx pgx.Tx, userID string) ([]model.Consent, error) {
	rows, err := tx.Query(ctx, `SELECT id, user_id, document, version, accepted_at FROM consent_record
		WHERE user_id = $1 ORDER BY accepted_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	return collect(rows, func(r pgx.Row) (*model.Consent, error) {
		var c model.Consent
		return &c, r.Scan(&c.ID, &c.UserID, &c.Document, &c.Version, &c.AcceptedAt)
	})
}

// HasAIConsent reports whether the user accepted ai_processing. Consent is
// per user: the uploader's consent gates their upload (E-3).
func HasAIConsent(ctx context.Context, tx pgx.Tx, userID string) (bool, error) {
	var ok bool
	err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM consent_record WHERE user_id = $1 AND document = 'ai_processing')`, userID).Scan(&ok)
	return ok, err
}
