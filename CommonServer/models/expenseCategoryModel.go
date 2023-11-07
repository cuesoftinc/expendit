package models 



import (
	"gorm.io/gorm"
)

type ExpenseCategory  struct {
	gorm.Model
	Name      int    `gorm:"size:255;not null;unique" json:amount`
    Description string  `gorm:size:255;not null; unique" json:description`  
    UserID      uint
}