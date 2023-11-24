package models

import (
    "go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type Income struct {
    ID             primitive.ObjectID `bson:"_id"`
    Amount         float64             `json:"amount" validate:"required,min=1,max=500"`     
    Date           string              `json:"date"`
    Description    string              `json:"description" validate:"required,min=2,max=500"`
    CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"` 
    UserID         uint 
 
}
