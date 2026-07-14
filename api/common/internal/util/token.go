package util 

import (
	"github.com/thanhpk/randstr"

)


func GenerateUniqueToken() string {
    token := randstr.String(32)
	return token
}
