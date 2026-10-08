// Package repository is the only code that talks to Postgres (S-2: api/common
// is its sole client). Every statement runs inside a transaction that is
// either scoped to one org, so row-level security enforces tenancy (S-11),
// or explicitly marked as a system operation.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned for missing rows, including rows in another org
// (cross-org access is not_found, never forbidden: engineering.md §2).
var ErrNotFound = errors.New("not found")

// ErrConflict is returned for unique-constraint violations.
var ErrConflict = errors.New("conflict")

type DB struct {
	Pool *pgxpool.Pool
}

func Open(ctx context.Context, url string) (*DB, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	return &DB{Pool: pool}, nil
}

func (db *DB) Close() { db.Pool.Close() }

func (db *DB) Ping(ctx context.Context) error { return db.Pool.Ping(ctx) }

// InOrg runs fn in a transaction where only orgID's rows are visible.
func (db *DB) InOrg(ctx context.Context, orgID string, fn func(pgx.Tx) error) error {
	return pgx.BeginFunc(ctx, db.Pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT set_config('app.org_id', $1, true)`, orgID); err != nil {
			return err
		}
		return fn(tx)
	})
}

// AsSystem runs fn with row-level security bypassed: sign-in, membership
// lookups across a user's orgs, consumers and sweeps.
func (db *DB) AsSystem(ctx context.Context, fn func(pgx.Tx) error) error {
	return pgx.BeginFunc(ctx, db.Pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT set_config('app.bypass_rls', 'on', true)`); err != nil {
			return err
		}
		return fn(tx)
	})
}

// Narrow drops a system transaction down to one org for the rest of its
// life, so reference-data queries can't read across tenants.
func Narrow(ctx context.Context, tx pgx.Tx, orgID string) error {
	_, err := tx.Exec(ctx, `SELECT set_config('app.bypass_rls', 'off', true), set_config('app.org_id', $1, true)`, orgID)
	return err
}

// translate maps driver errors onto the package's sentinel errors.
func translate(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrConflict
	}
	return err
}
