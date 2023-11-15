package models 

import (
	"time"
    
)

type Expense struct {
	Amount      string    `json:"amount" validate:"required,min=1,max=500`
    Date        time.Time    `json:"date"`
    Items       string    `json:"items" validate:"required,min=2,max=500`
    Description string    `json:"description" validate:required,min=2,max=500` 
    Category     ExpenseCategory 
    UserID      uint
}