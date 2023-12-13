package models

type Authentication struct{
	Firstname string `json:"firstname"binding:"required"`
	Lastname string `json:lastname"binding:"required"`
	Email string `json:"email"binding:"required"`
  Password string `json:"password"binding:"required"`

}

