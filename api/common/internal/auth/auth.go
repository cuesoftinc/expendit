// Package auth signs people in with Google and issues the session token the
// API accepts. The token is a JWT signed with JWT_SECRET; a sign-in ends in a
// one-time handoff code that the web app exchanges for it.
package auth

import "errors"

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpired      = errors.New("token expired")
)

// Identity is what Google tells us about the person signing in.
type Identity struct {
	UID   string
	Email string
	Name  string
}
