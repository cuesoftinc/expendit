package service

// Trimmed down when the import pipeline moved to api/process: this file now
// only keeps what internal/handler/ai_summary_controller.go needs (the
// dashboard AI insight feature, unrelated to receipt uploads). Extraction,
// vision, and batch-categorization moved to api/process/service/ai_enhancer.py.

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

// AIEnhancer calls whichever LLM provider is configured via env vars.
// Priority: GROQ_API_KEY -> GEMINI_API_KEY
type AIEnhancer struct {
	provider string
	apiKey   string
	client   *http.Client
}

func NewAIEnhancer() *AIEnhancer {
	if key := os.Getenv("GROQ_API_KEY"); key != "" {
		log.Printf("[AI] using Groq")
		return &AIEnhancer{provider: "groq", apiKey: key, client: &http.Client{Timeout: 30 * time.Second}}
	}
	if key := os.Getenv("GEMINI_API_KEY"); key != "" {
		log.Printf("[AI] using Gemini")
		return &AIEnhancer{provider: "gemini", apiKey: key, client: &http.Client{Timeout: 30 * time.Second}}
	}
	return nil
}

type groqRequest struct {
	Model       string        `json:"model"`
	Messages    []groqMessage `json:"messages"`
	Temperature float32       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

var groqModels = []string{
	"llama-3.3-70b-versatile", // 12k TPM — best quality
	"llama-3.1-8b-instant",    // 20k TPM — higher limit, good fallback
	"gemma2-9b-it",            // separate quota pool
}

type geminiRequest struct {
	Contents         []geminiContent `json:"contents"`
	GenerationConfig geminiGenConfig `json:"generationConfig"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiGenConfig struct {
	Temperature float32 `json:"temperature"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

var geminiModels = []string{"gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"}

// GenerateText is a public wrapper around generate for use outside the service package.
// It uses a lower MaxTokens (512) suitable for short summaries.
func (a *AIEnhancer) GenerateText(ctx context.Context, prompt string) (string, error) {
	if a == nil {
		return "", fmt.Errorf("AI not available")
	}
	switch a.provider {
	case "groq":
		return a.generateGroqWithTokens(ctx, prompt, 512)
	default:
		return a.generateGemini(ctx, prompt)
	}
}

func (a *AIEnhancer) generateGroqWithTokens(ctx context.Context, prompt string, maxTokens int) (string, error) {
	for _, model := range groqModels {
		payload := groqRequest{
			Model:       model,
			Messages:    []groqMessage{{Role: "user", Content: prompt}},
			Temperature: 0.3,
			MaxTokens:   maxTokens,
		}
		body, _ := json.Marshal(payload)

		req, err := http.NewRequestWithContext(ctx, http.MethodPost,
			"https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+a.apiKey)

		resp, err := a.client.Do(req)
		if err != nil {
			log.Printf("[AI] Groq %s request failed: %v", model, err)
			continue
		}

		if resp.StatusCode == http.StatusNotFound ||
			resp.StatusCode == http.StatusTooManyRequests ||
			resp.StatusCode == http.StatusRequestEntityTooLarge {
			resp.Body.Close()
			log.Printf("[AI] Groq %s unavailable (%d), trying next", model, resp.StatusCode)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			var errBody map[string]any
			json.NewDecoder(resp.Body).Decode(&errBody)
			resp.Body.Close()
			log.Printf("[AI] Groq %s returned %d: %v", model, resp.StatusCode, errBody)
			return "", fmt.Errorf("Groq API returned %d", resp.StatusCode)
		}

		var groqResp groqResponse
		if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
			resp.Body.Close()
			return "", err
		}
		resp.Body.Close()

		if len(groqResp.Choices) == 0 {
			return "", fmt.Errorf("empty Groq response")
		}
		return groqResp.Choices[0].Message.Content, nil
	}
	return "", fmt.Errorf("no available Groq model")
}

func (a *AIEnhancer) generateGemini(ctx context.Context, prompt string) (string, error) {
	payload := geminiRequest{
		Contents:         []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
		GenerationConfig: geminiGenConfig{Temperature: 0.1},
	}
	body, _ := json.Marshal(payload)

	for _, model := range geminiModels {
		url := "https://generativelanguage.googleapis.com/v1/models/" + model + ":generateContent?key=" + a.apiKey
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := a.client.Do(req)
		if err != nil {
			log.Printf("[AI] Gemini %s request failed: %v", model, err)
			continue
		}

		if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			log.Printf("[AI] Gemini model %s unavailable (%d), trying next", model, resp.StatusCode)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			var errBody map[string]any
			json.NewDecoder(resp.Body).Decode(&errBody)
			resp.Body.Close()
			log.Printf("[AI] Gemini %s returned %d: %v", model, resp.StatusCode, errBody)
			return "", fmt.Errorf("Gemini API returned %d", resp.StatusCode)
		}

		var gemResp geminiResponse
		if err := json.NewDecoder(resp.Body).Decode(&gemResp); err != nil {
			resp.Body.Close()
			return "", err
		}
		resp.Body.Close()

		if len(gemResp.Candidates) == 0 || len(gemResp.Candidates[0].Content.Parts) == 0 {
			return "", fmt.Errorf("empty Gemini response")
		}
		text := gemResp.Candidates[0].Content.Parts[0].Text
		log.Printf("[AI] Gemini %s responded (%d chars)", model, len(text))
		return text, nil
	}
	return "", fmt.Errorf("no available Gemini model")
}
