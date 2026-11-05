package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSettleAnswersWhetherTheConsumersCaughtUp(t *testing.T) {
	for _, caught := range []bool{true, false} {
		rec := httptest.NewRecorder()
		Settle(func(context.Context) bool { return caught })(rec, httptest.NewRequest(http.MethodPost, "/internal/settle", nil))
		var body struct {
			CaughtUp bool `json:"caught_up"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || rec.Code != http.StatusOK || body.CaughtUp != caught {
			t.Fatalf("caught=%v: status %d body %s", caught, rec.Code, rec.Body.String())
		}
	}
}
