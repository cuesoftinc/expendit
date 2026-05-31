package validators

import "regexp"

var (
	lowercase = regexp.MustCompile(`[a-z]`)
	uppercase = regexp.MustCompile(`[A-Z]`)
	number    = regexp.MustCompile(`[0-9]`)
	special   = regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`)
)

func IsStrongPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	return lowercase.MatchString(password) &&
		uppercase.MatchString(password) &&
		number.MatchString(password) &&
		special.MatchString(password)
}