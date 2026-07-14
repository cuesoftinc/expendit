package service

import (
	"context"
	"crypto/sha256"
	"fmt"
	"regexp"
	"strings"
	"time"

	"expendit-server/internal/database"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

var fingerprintCol *mongo.Collection = database.OpenCollection(database.Client, "import_fingerprints")

var nonAlphaNum = regexp.MustCompile(`[^a-z0-9 ]`)

type DuplicateDetector struct {
	userID    string
	batchSeen map[string]bool // fingerprints encountered within the current import
}

func NewDuplicateDetector(userID string) *DuplicateDetector {
	return &DuplicateDetector{
		userID:    userID,
		batchSeen: make(map[string]bool),
	}
}

// IsDuplicate returns true if an exact match exists in this batch or in the DB.
func (d *DuplicateDetector) IsDuplicate(ctx context.Context, txn RawTransaction) (bool, error) {
	fp := Fingerprint(txn)

	if d.batchSeen[fp] {
		return true, nil
	}

	count, err := fingerprintCol.CountDocuments(ctx, bson.M{
		"fingerprint": fp,
		"userid":      d.userID,
	})
	if err != nil {
		return false, err
	}
	if count > 0 {
		return true, nil
	}

	d.batchSeen[fp] = true
	return false, nil
}

// IsFuzzyDuplicate checks if txn is a near-duplicate of anything already in batch.
// Same amount, within 3 days, and Jaccard similarity > 0.8 on normalized descriptions.
func (d *DuplicateDetector) IsFuzzyDuplicate(batch []RawTransaction, txn RawTransaction) bool {
	for _, other := range batch {
		if other.Amount != txn.Amount {
			continue
		}
		dayDiff := txn.Date.Sub(other.Date).Hours() / 24
		if dayDiff < 0 {
			dayDiff = -dayDiff
		}
		if dayDiff > 3 {
			continue
		}
		if jaccardSimilarity(normalizeDesc(txn.Description), normalizeDesc(other.Description)) > 0.8 {
			return true
		}
	}
	return false
}

// PersistFingerprints saves fingerprints for confirmed transactions so future imports skip them.
func (d *DuplicateDetector) PersistFingerprints(ctx context.Context, txns []RawTransaction) error {
	if len(txns) == 0 {
		return nil
	}
	docs := make([]interface{}, 0, len(txns))
	for _, txn := range txns {
		docs = append(docs, bson.M{
			"fingerprint": Fingerprint(txn),
			"userid":      d.userID,
			"created_at":  time.Now(),
		})
	}
	_, err := fingerprintCol.InsertMany(ctx, docs)
	return err
}

func Fingerprint(txn RawTransaction) string {
	day := txn.Date.Format("2006-01-02")
	amount := fmt.Sprintf("%.2f", txn.Amount)
	desc := normalizeDesc(txn.Description)
	sum := sha256.Sum256([]byte(day + ":" + amount + ":" + desc))
	return fmt.Sprintf("%x", sum)
}

func normalizeDesc(s string) string {
	s = strings.ToLower(s)
	s = nonAlphaNum.ReplaceAllString(s, " ")
	s = strings.Join(strings.Fields(s), " ")
	return s
}

func jaccardSimilarity(a, b string) float64 {
	setA := tokenSet(a)
	setB := tokenSet(b)

	intersection := 0
	for t := range setA {
		if setB[t] {
			intersection++
		}
	}
	union := len(setA) + len(setB) - intersection
	if union == 0 {
		return 1.0
	}
	return float64(intersection) / float64(union)
}

func tokenSet(s string) map[string]bool {
	tokens := strings.Fields(s)
	set := make(map[string]bool, len(tokens))
	for _, t := range tokens {
		set[t] = true
	}
	return set
}
