package models

import (
    "go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type Income struct {
    ID          primitive.ObjectID `bson:"_id"`
    Amount      string   `json:amount" validate:required,min=1,max=500`     
    Date        time.Time
    Category    IncomeCategory 
    Description string   `json:"description" validate:required,min=2,max=500`
    UserID      uint 
}
