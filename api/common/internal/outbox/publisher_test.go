package outbox

import (
	"testing"
	"time"

	"github.com/cuesoftinc/expendit/api/common/internal/repository"
)

func TestClaimKeyIsStablePerRow(t *testing.T) {
	at := time.Date(2026, 10, 27, 9, 0, 0, 123000, time.UTC)
	row := repository.OutboxRow{ID: 42, CreatedAt: at}
	if ClaimKey(row) != ClaimKey(row) || ClaimKey(row) != "outbox-42-1793091600000123" {
		t.Fatalf("claim key: %s", ClaimKey(row))
	}
	if ClaimKey(repository.OutboxRow{ID: 43, CreatedAt: at}) == ClaimKey(row) {
		t.Fatal("rows must not share a claim-check object")
	}
	if ClaimKey(repository.OutboxRow{ID: 42, CreatedAt: at.Add(time.Microsecond)}) == ClaimKey(row) {
		t.Fatal("a restarted id sequence must not reuse an old object")
	}
}
