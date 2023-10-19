package models

import (
	"gorm.io/gorm"
	"expendit-server/database"
	"html"
	"strings"

	"golang.org/x/crypto/bcrypt"
	
)

type User struct {
    gorm.Model
	Firstname string `gorm:"size:255;not null;unique" json:"firstname"`
	Lastname  string `gorm:"size:255;not null;unique" json:"lastname"`
	Email     string `gorm:"size:255;not null;unique"json:"email"`
    Password  string `gorm:"size:255;not null;" json:"-"`
    Expenses  []Expense
	Incomes   []Income
}



func (user *User) Save() (*User, error) {
	err := database.Database.Create(&user).Error
	if err != nil {
		return &User{}, err
	}
	return user, nil
}

func (user *User) BeforeSave(*gorm.DB) error {

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.Password = string(passwordHash)
	user.Email = html.EscapeString(strings.TrimSpace(user.Email))
	user.Firstname = html.EscapeString(strings.TrimSpace(user.Firstname))
	user.Lastname = html.EscapeString(strings.TrimSpace(user.Lastname))
	return nil
}


func (user *User) ValidatePassword(password string) error {
	return bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
}

func FindUserByEmail(email string) (User, error) {
	var user User
	err := database.Database.Where("email=?", email).Find(&user).Error
	if err != nil {
		return User{}, err
	}
	return user, nil
}

func FindUserById(id uint) (User, error) {
	var user User
	err := database.Database.Preload("Expenses").Where("ID=?", id).Find(&user).Error
	if err != nil {
		return User{}, err
	}
	return user, nil
}