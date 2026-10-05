package service

import (
	"context"
	"encoding/json"
	"io/fs"
	"log/slog"

	"github.com/jackc/pgx/v5"

	"github.com/cuesoftinc/expendit/api/common/contract"
	"github.com/cuesoftinc/expendit/api/common/internal/kafka"
	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

// SeedRulesets stores the NG rule sets shipped in contract/examples and
// queues any that changed for the compacted topic (S-10). Sign-off is never
// taken from these files: it is recorded in tax_ruleset by a practitioner.
func SeedRulesets(ctx context.Context, db *repository.DB) error {
	names, err := fs.Glob(contract.Schemas, "examples/config.rulesets.*.json")
	if err != nil {
		return err
	}
	return db.AsSystem(ctx, func(tx pgx.Tx) error {
		for _, name := range names {
			raw, err := contract.Schemas.ReadFile(name)
			if err != nil {
				return err
			}
			var env struct {
				Data repository.Ruleset `json:"data"`
			}
			if err := json.Unmarshal(raw, &env); err != nil {
				return err
			}
			changed, err := repository.UpsertRuleset(ctx, tx, env.Data, kafka.TopicConfigRulesets)
			if err != nil {
				return err
			}
			if changed {
				slog.Info("rule set published", "ruleset", env.Data.ID)
			}
		}
		return nil
	})
}

func RepublishRulesets(ctx context.Context, db *repository.DB) error {
	return db.AsSystem(ctx, func(tx pgx.Tx) error {
		return repository.RepublishRulesets(ctx, tx, kafka.TopicConfigRulesets)
	})
}
