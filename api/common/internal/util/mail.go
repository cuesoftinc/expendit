
package util

import (
	"fmt"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"
)

var EMAIL_FROM string = os.Getenv("EMAIL_FROM")
var SMTP_Host string = os.Getenv("SMTP_Host")
var SMTP_User string = os.Getenv("SMTP_User")
var SMTP_Password string = os.Getenv("SMTP_Password")
var FRONTEND_URL string = os.Getenv("FRONTEND_URL")

func getSMTPPort() int {
	if p, err := strconv.Atoi(os.Getenv("SMTP_Port")); err == nil {
		return p
	}
	return 587
}

func SendResetPasswordEmail(toEmail, resetToken string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", EMAIL_FROM)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Reset Password")
	m.SetBody("text/html", "Click the following link to reset your password: <a href=\""+FRONTEND_URL+"/forgotpassword/new_password/?resetToken="+resetToken+"\">Reset Password</a>")

	d := gomail.NewDialer(SMTP_Host, getSMTPPort(), SMTP_User, SMTP_Password)

	if err := d.DialAndSend(m); err != nil {
		fmt.Println("Error sending email:", err)
		return err
	}

	return nil
}