// Package aiven powers the Kafka service back on when Aiven has powered it
// off (system-design.md §16 I-17). Aiven's free Kafka plan powers off after
// 24 hours with no produce or consume, and stays off until someone powers
// it on. The reaper calls EnsurePowered on every run, so an outage lasts
// one reaper interval plus Aiven's start-up time (minutes, at worst hours).
package aiven

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"time"
)

const DefaultBaseURL = "https://api.aiven.io/v1"

type Client struct {
	BaseURL string
	Token   string
	Project string
	Service string
	HTTP    *http.Client
}

// New returns nil when any setting is missing: the watchdog is optional
// (paid plans and compose never power off).
func New(token, project, service string) *Client {
	if token == "" || project == "" || service == "" {
		return nil
	}
	return &Client{BaseURL: DefaultBaseURL, Token: token, Project: project, Service: service,
		HTTP: &http.Client{Timeout: 20 * time.Second}}
}

// EnsurePowered returns the service state ("RUNNING", "REBUILDING",
// "POWEROFF", …) and, when it is POWEROFF, asks Aiven to power it on.
func (c *Client) EnsurePowered(ctx context.Context) (state string, poweredOn bool, err error) {
	var got struct {
		Service struct {
			State string `json:"state"`
		} `json:"service"`
	}
	if err := c.do(ctx, http.MethodGet, nil, &got); err != nil {
		return "", false, err
	}
	state = got.Service.State
	if state != "POWEROFF" {
		return state, false, nil
	}
	slog.Warn("Kafka is powered off; powering it on", "step", "kafka.power", "service", c.Service)
	if err := c.do(ctx, http.MethodPut, map[string]any{"powered": true}, nil); err != nil {
		return state, false, err
	}
	return state, true, nil
}

func (c *Client) do(ctx context.Context, method string, body, out any) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}
	u := fmt.Sprintf("%s/project/%s/service/%s", c.BaseURL, url.PathEscape(c.Project), url.PathEscape(c.Service))
	req, err := http.NewRequestWithContext(ctx, method, u, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "aivenv1 "+c.Token)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return err
	}
	if res.StatusCode >= 300 {
		// Aiven's error bodies carry a message, never the token.
		var e struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &e)
		return fmt.Errorf("aiven %s: status %d: %s", method, res.StatusCode, e.Message)
	}
	if out != nil {
		return json.Unmarshal(raw, out)
	}
	return nil
}
