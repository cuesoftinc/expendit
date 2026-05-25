package models


import (
	"time"
)


type ExpenseCategory struct{
    Amount        string    `json:"amount" validate:required,min=1,max=500`
	Description   string    `json:"description" validate:required,min=1,max=500`
	Date          time.Time  `json:"date"`
	UserID        uint  
}