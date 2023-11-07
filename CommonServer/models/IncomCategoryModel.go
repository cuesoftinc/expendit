package models


import (
	"gorm.io/gorm"

)


type IncomeCategory struct{
	 gorm.Model
     ID    int
	 Name string 
	 Description string
}