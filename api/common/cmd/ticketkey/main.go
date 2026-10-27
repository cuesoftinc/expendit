// Command ticketkey generates an upload-ticket key pair (S-5):
//
//	go run ./cmd/ticketkey [kid]
//
// Put the private line in api/common's secrets and the public line in
// api/statements' UPLOAD_TICKET_PUBLIC_KEYS (append it to rotate).
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"time"
)

func main() {
	kid := time.Now().UTC().Format("2006-01")
	if len(os.Args) > 1 {
		kid = os.Args[1]
	}
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	enc := base64.RawURLEncoding.EncodeToString
	fmt.Printf("UPLOAD_TICKET_PRIVATE_KEY=%s:%s\n", kid, enc(priv.Seed()))
	fmt.Printf("UPLOAD_TICKET_PUBLIC_KEYS=%s:%s\n", kid, enc(pub))
}
