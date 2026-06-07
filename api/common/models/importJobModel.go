package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ImportStatus string

const (
	ImportStatusProcessing ImportStatus = "processing"
	ImportStatusCompleted  ImportStatus = "completed"
	ImportStatusFailed     ImportStatus = "failed"
)

type AnomalyType string

const (
	AnomalyLargeTransaction AnomalyType = "large_transaction"
	AnomalySpendingSpike    AnomalyType = "spending_spike"
	AnomalyAbnormalCategory AnomalyType = "abnormal_category"
	AnomalyDuplicateCharge  AnomalyType = "duplicate_charge"
)

type Anomaly struct {
	Type        AnomalyType `bson:"type" json:"type"`
	Description string      `bson:"description" json:"description"`
	Amount      float64     `bson:"amount,omitempty" json:"amount,omitempty"`
	Category    string      `bson:"category,omitempty" json:"category,omitempty"`
}

type MonthlyTrend struct {
	Month    string  `bson:"month" json:"month"`
	Income   float64 `bson:"income" json:"income"`
	Expenses float64 `bson:"expenses" json:"expenses"`
}

type ImportSummary struct {
	TotalIncome   float64            `bson:"total_income" json:"total_income"`
	TotalExpenses float64            `bson:"total_expenses" json:"total_expenses"`
	NetCashFlow   float64            `bson:"net_cash_flow" json:"net_cash_flow"`
	ByCategory    map[string]float64 `bson:"by_category" json:"by_category"`
	MonthlyTrends []MonthlyTrend     `bson:"monthly_trends" json:"monthly_trends"`
}

type ImportJob struct {
	ID              primitive.ObjectID `bson:"_id" json:"id"`
	UserID          string             `bson:"userid" json:"userid"`
	Status          ImportStatus       `bson:"status" json:"status"`
	FileName        string             `bson:"file_name" json:"file_name"`
	FileType        string             `bson:"file_type" json:"file_type"`
	TotalParsed     int                `bson:"total_parsed" json:"total_parsed"`
	DuplicatesFound int                `bson:"duplicates_found" json:"duplicates_found"`
	Imported        int                `bson:"imported" json:"imported"`
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	CompletedAt     *time.Time         `bson:"completed_at,omitempty" json:"completed_at,omitempty"`
	Error           string             `bson:"error,omitempty" json:"error,omitempty"`
	Summary         *ImportSummary     `bson:"summary,omitempty" json:"summary,omitempty"`
	AISummary       string             `bson:"ai_summary,omitempty" json:"ai_summary,omitempty"`
	Anomalies       []Anomaly          `bson:"anomalies" json:"anomalies"`
}
