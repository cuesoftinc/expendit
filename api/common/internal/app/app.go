// Package app wires config into dependencies once, for cmd/server and
// cmd/jobs alike.
package app

import (
	"context"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/config"
	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/ratelimit"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
	"github.com/cuesoftinc/expendit/api/common/internal/service"
	"github.com/cuesoftinc/expendit/api/common/internal/storage"
	"github.com/cuesoftinc/expendit/api/common/internal/ticket"
)

type App struct {
	Config   *config.Config
	DB       *repository.DB
	Store    storage.Store
	Limiter  *ratelimit.Limiter
	Contract *kafka.Contract

	Identity   *service.Identity
	Ledger     *service.Ledger
	Imports    *service.Imports
	Statements *service.Statements
	Compute    *service.Compute
}

func New(ctx context.Context, cfg *config.Config) (*App, error) {
	db, err := repository.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	store, err := storage.Open(ctx, cfg.Storage)
	if err != nil {
		return nil, err
	}
	contract, err := kafka.LoadContract()
	if err != nil {
		return nil, err
	}
	limiter := ratelimit.New(cfg.Redis)
	signer := ticket.NewSigner(cfg.Ticket.KeyID, cfg.Ticket.PrivateKey, cfg.Ticket.TTL)
	now := time.Now

	a := &App{Config: cfg, DB: db, Store: store, Limiter: limiter, Contract: contract}
	a.Identity = &service.Identity{DB: db}
	a.Ledger = &service.Ledger{DB: db}
	a.Compute = &service.Compute{DB: db, Now: now}
	a.Imports = &service.Imports{DB: db, Tickets: signer, Limiter: limiter, Store: store, MaxBytes: cfg.UploadMaxBytes,
		PerHour: cfg.UploadsPerHour, PerDay: cfg.UploadsPerDay, BytesDay: cfg.UploadBytesDay, Now: now}
	a.Statements = &service.Statements{DB: db, Imports: a.Imports, Compute: a.Compute, Tickets: signer, Limiter: limiter,
		MaxBytes: cfg.UploadMaxBytes}
	return a, nil
}

func (a *App) Close() {
	a.DB.Close()
	_ = a.Limiter.Close()
}
