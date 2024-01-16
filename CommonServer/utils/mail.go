
package utils

import (
	"fmt"
	"os"

	"gopkg.in/gomail.v2"
)

var EMAIL_FROM string = os.Getenv("EMAIL_FROM")
var SMTP_Host string = os.Getenv("SMTP_Host")
var SMTP_User string = os.Getenv("SMTP_User")
var SMTP_Password string = os.Getenv("SMTP_Password")

func SendResetPasswordEmail(toEmail, resetToken string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", EMAIL_FROM)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Reset Password")
	m.SetBody("text/html", "Click the following link to reset your password: <a href=\"http://localhost:3000/forgotpassword/new_password/?resetToken="+resetToken+"\">Reset Password</a>")

	d := gomail.NewDialer(SMTP_Host, 2525, SMTP_User, SMTP_Password)

	if err := d.DialAndSend(m); err != nil {
		fmt.Println("Error sending email:", err)
		return err
	}

	return nil
}