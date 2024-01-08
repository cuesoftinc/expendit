package utils


import (
  "os"
  "gopkg.in/gomail.v2"
)



var  EMAIL_FROM  string = os.Getenv("EMAIL_FROM")
var  SMTP_Host  string = os.Getenv("SMTP_Host")
var  SMTP_User  string = os.Getenv("SMTP_User")
var  SMTP_Password  string = os.Getenv("SMTP_Password")
var  SMTP_Port  int = os.Getenv("SMTP_Password")


func SendResetPasswordEmail(toEmail, resetToken string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", EMAIL_FROM)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Reset Password")
	m.SetBody("text/html", "Click the following link to reset your password: <a href=\"http://localhost:9000/users/reset-password/"+resetToken+"\">Reset Password</a>")

	d := gomail.NewDialer(SMTP_Host, SMTP_Port , SMTP_User, SMTP_Password)

	return d.DialAndSend(m)
}
