package util

import (
	"log/slog"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"
)

// Env is read at call time (not package init) so values loaded from .env by
// main are honored.
func getSMTPPort() int {
	if p, err := strconv.Atoi(os.Getenv("SMTP_PORT")); err == nil {
		return p
	}
	return 587
}

func SendResetPasswordEmail(toEmail, resetToken string) error {
	m := gomail.NewMessage()
	m.SetHeader("From", os.Getenv("EMAIL_FROM"))
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", "Reset Password")
	m.SetBody("text/html", "Click the following link to reset your password: <a href=\""+os.Getenv("FRONTEND_URL")+"/forgot-password/new-password/?resetToken="+resetToken+"\">Reset Password</a>")

	d := gomail.NewDialer(os.Getenv("SMTP_HOST"), getSMTPPort(), os.Getenv("SMTP_USER"), os.Getenv("SMTP_PASSWORD"))

	if err := d.DialAndSend(m); err != nil {
		slog.Error("failed to send reset-password email", "error", err)
		return err
	}

	return nil
}
