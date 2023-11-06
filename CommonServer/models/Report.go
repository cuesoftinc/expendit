package models


import (
	"gorm.io/gorm"
)

type Report  struct {
	gorm.Model
    Title   string 
    Expenses []Expense
    summary  string 
}