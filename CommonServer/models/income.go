package models

import (
	"gorm.io/gorm"
)

type Income struct {
    gorm.Model
    Amount      int    `gorm:"size:255;not null;unique" json:amount"`     
    Date        string `gorm:"size:255;not null;unique" json:date`
    Source      string `gorm:"size:255;not null;unique" json:source`
    UserID      uint 
}
