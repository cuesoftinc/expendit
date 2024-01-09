package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type User struct {
	ID            primitive.ObjectID `bson:"_id"`
	First_name    *string            `json:"first_name" validate:"required,min=2,max=100"`
	Last_name     *string            `json:"last_name" validate:"required,min=2,max=100"`
	Email         *string            `json:"email" validate:"email,required"`
	Password      *string            `json:"password" validate:"required,min=6"`
	Phone         *string            `json:"phone" validate:"required"`
	Token         *string            `json:"token"`
	User_type     *string            `json:"user_type" validate:"required,eq=ADMIN|eq=USER"`
	Refresh_token *string            `json:"refresh_token"`
	Created_at    time.Time          `json:"created_at"`
	Updated_at    time.Time          `json:"updated_at"`
	User_id       string             `json:"user_id"`
}


type ChangePasswordRequest struct {
	OldPassword     *string `json:"old_password" validate:"required"`
	NewPassword     *string `json:"new_password" validate:"required,min=8"`
	ConfirmPassword *string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}



type ForgotPasswordRequest struct{
	Email *string  `json:"email" binding:"required"` 
}

type ResetPasswordRequest struct {
	NewPassword *string `json:"new_password" validate:"required,min=6"`
	ConPassword *string `json:"con_password" validate:"required,min=6,eqfield=NewPassword"`
	First_name  string `json:"first_name" validate:"-"`
	Last_name   string `json:"last_name" validate:"-"`
	Email       string `json:"email" validate:"-"`
	Phone       string `json:"phone" validate:"-"`
	User_type   string `json:"user_type" validate:"-"`
}