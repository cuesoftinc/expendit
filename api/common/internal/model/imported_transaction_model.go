package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ImportedTransaction struct {
	ID            primitive.ObjectID `bson:"_id" json:"id"`
	ImportJobID   primitive.ObjectID `bson:"import_job_id" json:"import_job_id"`
	UserID        string             `bson:"userid" json:"userid"`
	Date          time.Time          `bson:"date" json:"date"`
	Amount        float64            `bson:"amount" json:"amount"`
	Description   string             `bson:"description" json:"description"`
	Category      string             `bson:"category" json:"category"`
	AICategorized bool               `bson:"ai_categorized" json:"ai_categorized"`
	Type          string             `bson:"type" json:"type"` // "expense" or "income"
	IsDuplicate   bool               `bson:"is_duplicate" json:"is_duplicate"`
	Fingerprint   string             `bson:"fingerprint" json:"fingerprint"`
	Confirmed     bool               `bson:"confirmed" json:"confirmed"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
}
