package model

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
	"time"
)

type User struct {
	ID         primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	First_name *string            `json:"first_name,omitempty" bson:"first_name,omitempty" validate:"required,min=2,max=50"`
	Last_name  *string            `json:"last_name,omitempty" bson:"last_name,omitempty" validate:"required,min=2,max=50"`
	Email      *string            `json:"email,omitempty" bson:"email,omitempty" validate:"required,email"`
	Password   *string            `json:"password,omitempty" bson:"password,omitempty" validate:"required,min=8,max=128"`
	Phone      *string            `json:"phone,omitempty" bson:"phone,omitempty" validate:"required"`
	Token      *string            `json:"token,omitempty" bson:"token,omitempty"`
	// User_type     *string            `json:"user_type,omitempty" bson:"user_type,omitempty" validate:"required,oneof=ADMIN USER"`
	User_type     *string   `json:"user_type,omitempty" bson:"user_type,omitempty"`
	Refresh_token *string   `json:"refresh_token,omitempty" bson:"refresh_token,omitempty"`
	Created_at    time.Time `json:"created_at,omitempty" bson:"created_at,omitempty"`
	Updated_at    time.Time `json:"updated_at,omitempty" bson:"updated_at,omitempty"`
	User_id       string    `json:"user_id,omitempty" bson:"user_id,omitempty"`
	Provider      *string   `json:"provider"`
}

type ChangePasswordRequest struct {
	OldPassword     *string `json:"old_password" validate:"required"`
	NewPassword     *string `json:"new_password" validate:"required,min=12,max=128"`
	ConfirmPassword *string `json:"confirm_password" validate:"required,eqfield=NewPassword"`
}

type ForgotPasswordRequest struct {
	Email *string `json:"email,omitempty" bson:"email,omitempty" validate:"required,email"`
}

type ResetPasswordRequest struct {
	NewPassword *string `json:"new_password" validate:"required,min=12,max=128"`
	ConPassword *string `json:"con_password" validate:"required,eqfield=NewPassword"`
}
