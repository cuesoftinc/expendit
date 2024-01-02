package models 

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive" 
)

type Expense struct {
	ID            primitive.ObjectID   `bson:"_id"`
	Amount        float64              `json:"amount" validate:"required,min=1,max=500"`
	Category      string               `json:"category" validate:"required,min=2,max=500"`
	Note          string               `json:"note" validate:"required,min=2,max=500"`
	CreatedAt     time.Time            `json:"created_at"`
	UpdatedAt     time.Time            `json:"updated_at"`  
	UserID        string			   `json:"userid"`
} 


