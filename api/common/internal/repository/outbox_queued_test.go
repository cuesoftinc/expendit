package repository

import (
	"context"
	"testing"
)

func TestQueuedCountsOnlyTheRequestThatOwnsIt(t *testing.T) {
	ctx, queued := WithQueued(context.Background())
	if queued.Any() {
		t.Fatal("a fresh request has queued nothing")
	}
	NoteQueued(context.WithValue(ctx, struct{}{}, 1))
	if !queued.Any() {
		t.Fatal("a row queued under the request's context must count")
	}

	_, other := WithQueued(context.Background())
	NoteQueued(context.Background())
	if other.Any() {
		t.Fatal("a row queued outside the request must not count against it")
	}
}
