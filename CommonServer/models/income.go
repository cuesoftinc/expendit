package models

import (
	"gorm.io/gorm"
    "time"
)

type Income struct {
    gorm.Model
    ID          int
    Amount      int    `gorm:"size:255;not null;unique" json:amount"`     
    Date        time.Time 
    Category    IncomeCategory 
    Description string `gorm:"size:255;not null;unique" json:description`
    UserID      uint 
}
