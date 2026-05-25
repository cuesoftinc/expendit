package models



import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)


type IncomeCategory struct {
	ID            primitive.ObjectID `bson:"_id"`
	Name          string              `json:"name" validate:required,min=2,max=500`
	Description   string              `json:"description validate:required,min=2,max=500`
}