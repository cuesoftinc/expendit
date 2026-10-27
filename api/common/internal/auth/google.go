package auth

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	googleAuthorizeURL = "https://accounts.google.com/o/oauth2/v2/auth"
	googleTokenURL     = "https://oauth2.googleapis.com/token"
	googleUserinfoURL  = "https://www.googleapis.com/oauth2/v3/userinfo"

	// maxBodySnippet caps how much of a Google error body reaches an error.
	maxBodySnippet = 512
)

// Google is the OAuth client for Google sign-in (authorization code with PKCE).
type Google struct {
	ClientID     string
	ClientSecret string

	httpClient  *http.Client
	tokenURL    string
	userinfoURL string
}

func NewGoogle(clientID, clientSecret string) *Google {
	return &Google{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
		tokenURL:     googleTokenURL,
		userinfoURL:  googleUserinfoURL,
	}
}

// PKCEChallengeS256 is the S256 code challenge of a verifier.
func PKCEChallengeS256(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func (g *Google) AuthorizeURL(redirectURI, state, challenge string) string {
	q := []string{
		"client_id=" + url.QueryEscape(g.ClientID),
		"response_type=code",
		"redirect_uri=" + url.QueryEscape(redirectURI),
		"scope=" + url.QueryEscape("openid email profile"),
		"state=" + url.QueryEscape(state),
		"code_challenge=" + url.QueryEscape(challenge),
		"code_challenge_method=S256",
		"access_type=offline",
	}
	return googleAuthorizeURL + "?" + strings.Join(q, "&")
}

// ExchangeCode trades the authorization code for the caller's Google profile.
func (g *Google) ExchangeCode(ctx context.Context, code, redirectURI, codeVerifier string) (*Identity, error) {
	form := url.Values{
		"client_id":     {g.ClientID},
		"client_secret": {g.ClientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
		"grant_type":    {"authorization_code"},
		"code_verifier": {codeVerifier},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err := g.do(req, &token); err != nil {
		return nil, fmt.Errorf("google token exchange: %w", err)
	}
	if token.AccessToken == "" {
		return nil, errors.New("google token exchange: no access token")
	}

	req, err = http.NewRequestWithContext(ctx, http.MethodGet, g.userinfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	var info struct {
		Sub   string `json:"sub"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := g.do(req, &info); err != nil {
		return nil, fmt.Errorf("google userinfo: %w", err)
	}
	if info.Sub == "" || info.Email == "" {
		return nil, errors.New("google userinfo: missing subject or email")
	}
	return &Identity{UID: info.Sub, Email: info.Email, Name: info.Name}, nil
}

func (g *Google) do(req *http.Request, out any) error {
	resp, err := g.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("status %d: %s", resp.StatusCode, bodySnippet(body))
	}
	return json.Unmarshal(body, out)
}

func bodySnippet(b []byte) string {
	if len(b) > maxBodySnippet {
		b = b[:maxBodySnippet]
	}
	return strings.TrimSpace(string(b))
}
