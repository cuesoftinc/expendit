package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/internal/auth"
)

// Handoffs stores the one-time sign-in codes in Postgres so any instance can
// redeem a code another instance issued.
type Handoffs struct {
	DB *DB
}

func (r *Handoffs) Create(ctx context.Context, h auth.NewHandoff) error {
	return r.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `INSERT INTO sso_handoff (body_code_hash, cookie_code_hash, user_id, challenge, expires_at)
			VALUES ($1, $2, $3, $4, $5)`, h.BodyCodeHash, h.CookieCodeHash, h.UserID, h.Challenge, h.ExpiresAt)
		return err
	})
}

// WithLocked holds the row lock until fn's changes are written, so two
// redeems of one code serialize and the second sees the sealed token.
func (r *Handoffs) WithLocked(ctx context.Context, codeHash, channel string, fn func(*auth.Handoff) error) error {
	column := "cookie_code_hash"
	if channel == auth.HandoffChannelBody {
		column = "body_code_hash"
	}
	return r.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		var (
			id string
			h  auth.Handoff
		)
		err := tx.QueryRow(ctx, `SELECT s.id, s.user_id, u.email, s.challenge, s.channel, s.token_ciphertext, s.consumed_at, s.expires_at
			FROM sso_handoff s JOIN app_user u ON u.id = s.user_id
			WHERE s.`+column+` = $1 AND s.expires_at > now()
			FOR UPDATE OF s`, codeHash).
			Scan(&id, &h.UserID, &h.Email, &h.Challenge, &h.Channel, &h.TokenCiphertext, &h.ConsumedAt, &h.ExpiresAt)
		if err != nil {
			if translate(err) == ErrNotFound {
				return auth.ErrHandoffNotFound
			}
			return err
		}
		if err := fn(&h); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE sso_handoff SET channel = $2, token_ciphertext = $3, consumed_at = $4, expires_at = $5 WHERE id = $1`,
			id, h.Channel, h.TokenCiphertext, h.ConsumedAt, h.ExpiresAt)
		return err
	})
}

func (r *Handoffs) DeleteExpired(ctx context.Context, now time.Time, limit int) error {
	return r.DB.AsSystem(ctx, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx, `DELETE FROM sso_handoff WHERE id IN
			(SELECT id FROM sso_handoff WHERE expires_at <= $1 LIMIT $2)`, now, limit)
		return err
	})
}
