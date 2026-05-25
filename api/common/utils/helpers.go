package utils

import "golang.org/x/crypto/bcrypt"

// HashPassword function to hash a password
func HashPassword(password *string) (string, error) {
	bytePassword := []byte(*password)
	hashPassword, _ := bcrypt.GenerateFromPassword(bytePassword, bcrypt.DefaultCost)
	*password = string(hashPassword)
	return *password, nil
}

// ComparePassword function to compare a hashed password with a password
func ComparePassword(hashedPassword string, password string) bool {
	byteHashedPassword := []byte(hashedPassword)
	bytePassword := []byte(password)
	err := bcrypt.CompareHashAndPassword(byteHashedPassword, bytePassword)
	if err != nil {
		return false
	}
	return true
}
