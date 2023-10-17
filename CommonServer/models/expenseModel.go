package models 

import (
	"gorm.io/gorm"
)

type Expense struct {
	gorm.Model
	Amount      int    `gorm:"size:255;not null;unique" json:amount`
    Date        string `gorm:"size:255;not null;unique" json:date`
    Items       string `gorm:size:255;not null; unique" json:items`
    Description string  `gorm:size:255;not null; unique" json:description`  
    UserID      uint
}