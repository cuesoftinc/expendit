package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// AIEnhancer calls whichever LLM provider is configured via env vars.
// Priority: GROQ_API_KEY → GEMINI_API_KEY
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

// ── Groq (OpenAI-compatible) ─────────────────────────────────────────────────

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

func (a *AIEnhancer) generateGroq(ctx context.Context, prompt string) (string, error) {
	for _, model := range groqModels {
		payload := groqRequest{
			Model:       model,
			Messages:    []groqMessage{{Role: "user", Content: prompt}},
			Temperature: 0.1,
			MaxTokens:   4096,
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
			log.Printf("[AI] Groq model %s unavailable (%d), trying next", model, resp.StatusCode)
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
		text := groqResp.Choices[0].Message.Content
		log.Printf("[AI] Groq %s responded (%d chars)", model, len(text))
		return text, nil
	}
	return "", fmt.Errorf("no available Groq model")
}

// ── Gemini (REST) ────────────────────────────────────────────────────────────

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

// ── Shared ───────────────────────────────────────────────────────────────────

// GenerateText is a public wrapper around generate for use outside the services package.
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

func (a *AIEnhancer) generate(ctx context.Context, prompt string) (string, error) {
	switch a.provider {
	case "groq":
		return a.generateGroq(ctx, prompt)
	default:
		return a.generateGemini(ctx, prompt)
	}
}

// ── Groq Vision ──────────────────────────────────────────────────────────────

var groqVisionModels = []string{
	"meta-llama/llama-4-scout-17b-16e-instruct",
	"meta-llama/llama-4-maverick-17b-128e-instruct",
}

type groqVisionRequest struct {
	Model       string              `json:"model"`
	Messages    []groqVisionMessage `json:"messages"`
	Temperature float32             `json:"temperature"`
	MaxTokens   int                 `json:"max_tokens"`
}

type groqVisionMessage struct {
	Role    string           `json:"role"`
	Content []groqVisionPart `json:"content"`
}

type groqVisionPart struct {
	Type     string        `json:"type"`
	Text     string        `json:"text,omitempty"`
	ImageURL *groqImageURL `json:"image_url,omitempty"`
}

type groqImageURL struct {
	URL string `json:"url"`
}

func (a *AIEnhancer) generateGroqVision(ctx context.Context, imageData []byte, mimeType, prompt string) (string, error) {
	dataURL := "data:" + mimeType + ";base64," + base64.StdEncoding.EncodeToString(imageData)

	for _, model := range groqVisionModels {
		payload := groqVisionRequest{
			Model: model,
			Messages: []groqVisionMessage{{
				Role: "user",
				Content: []groqVisionPart{
					{Type: "image_url", ImageURL: &groqImageURL{URL: dataURL}},
					{Type: "text", Text: prompt},
				},
			}},
			Temperature: 0.1,
			MaxTokens:   4096,
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
			log.Printf("[AI] Groq vision %s request failed: %v", model, err)
			continue
		}

		if resp.StatusCode == http.StatusNotFound ||
			resp.StatusCode == http.StatusTooManyRequests ||
			resp.StatusCode == http.StatusRequestEntityTooLarge {
			resp.Body.Close()
			log.Printf("[AI] Groq vision model %s unavailable (%d), trying next", model, resp.StatusCode)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			var errBody map[string]any
			json.NewDecoder(resp.Body).Decode(&errBody)
			resp.Body.Close()
			log.Printf("[AI] Groq vision %s returned %d: %v", model, resp.StatusCode, errBody)
			return "", fmt.Errorf("Groq vision API returned %d", resp.StatusCode)
		}

		var groqResp groqResponse
		if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
			resp.Body.Close()
			return "", err
		}
		resp.Body.Close()

		if len(groqResp.Choices) == 0 {
			return "", fmt.Errorf("empty Groq vision response")
		}
		text := groqResp.Choices[0].Message.Content
		log.Printf("[AI] Groq vision %s responded (%d chars)", model, len(text))
		return text, nil
	}
	return "", fmt.Errorf("no available Groq vision model")
}

// ── Gemini Vision ─────────────────────────────────────────────────────────────

type geminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiVisionPart struct {
	Text       string            `json:"text,omitempty"`
	InlineData *geminiInlineData `json:"inlineData,omitempty"`
}

type geminiVisionContent struct {
	Parts []geminiVisionPart `json:"parts"`
}

type geminiVisionRequest struct {
	Contents         []geminiVisionContent `json:"contents"`
	GenerationConfig geminiGenConfig       `json:"generationConfig"`
}

var geminiVisionModels = []string{"gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"}

func (a *AIEnhancer) generateGeminiVision(ctx context.Context, imageData []byte, mimeType, prompt string) (string, error) {
	b64 := base64.StdEncoding.EncodeToString(imageData)
	payload := geminiVisionRequest{
		Contents: []geminiVisionContent{{
			Parts: []geminiVisionPart{
				{InlineData: &geminiInlineData{MimeType: mimeType, Data: b64}},
				{Text: prompt},
			},
		}},
		GenerationConfig: geminiGenConfig{Temperature: 0.1},
	}
	body, _ := json.Marshal(payload)

	for _, model := range geminiVisionModels {
		url := "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + a.apiKey
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := a.client.Do(req)
		if err != nil {
			log.Printf("[AI] Gemini vision %s request failed: %v", model, err)
			continue
		}

		if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusTooManyRequests {
			resp.Body.Close()
			log.Printf("[AI] Gemini vision model %s unavailable (%d), trying next", model, resp.StatusCode)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			var errBody map[string]any
			json.NewDecoder(resp.Body).Decode(&errBody)
			resp.Body.Close()
			log.Printf("[AI] Gemini vision %s returned %d: %v", model, resp.StatusCode, errBody)
			return "", fmt.Errorf("Gemini vision API returned %d", resp.StatusCode)
		}

		var gemResp geminiResponse
		if err := json.NewDecoder(resp.Body).Decode(&gemResp); err != nil {
			resp.Body.Close()
			return "", err
		}
		resp.Body.Close()

		if len(gemResp.Candidates) == 0 || len(gemResp.Candidates[0].Content.Parts) == 0 {
			return "", fmt.Errorf("empty Gemini vision response")
		}
		text := gemResp.Candidates[0].Content.Parts[0].Text
		log.Printf("[AI] Gemini vision %s responded (%d chars)", model, len(text))
		return text, nil
	}
	return "", fmt.Errorf("no available Gemini vision model")
}

// ── Shared Vision ─────────────────────────────────────────────────────────────

const imageTransactionPrompt = "Extract all financial transactions from this bank statement image.\n" +
	"Return a JSON array where each item has:\n" +
	"- \"date\": YYYY-MM-DD\n" +
	"- \"description\": transaction description/narration\n" +
	"- \"amount\": positive number, no currency symbols\n" +
	"- \"type\": \"income\" or \"expense\"\n\n" +
	"Skip headers, totals, account summary rows, and opening/closing balances. Only actual transaction rows.\n" +
	"If you cannot find any transactions return an empty array []."

// ExtractTransactionsFromImage sends a bank statement image to a vision model and returns parsed transactions.
func (a *AIEnhancer) ExtractTransactionsFromImage(ctx context.Context, imageData []byte, mimeType string) ([]RawTransaction, error) {
	if a == nil {
		return nil, fmt.Errorf("AI not available")
	}

	var text string
	var err error
	switch a.provider {
	case "groq":
		text, err = a.generateGroqVision(ctx, imageData, mimeType, imageTransactionPrompt)
	default:
		text, err = a.generateGeminiVision(ctx, imageData, mimeType, imageTransactionPrompt)
	}
	if err != nil {
		return nil, err
	}

	var aiTxns []aiRawTransaction
	if err := json.Unmarshal([]byte(extractJSON(text)), &aiTxns); err != nil {
		return nil, fmt.Errorf("failed to parse AI image response: %w", err)
	}

	seen := make(map[string]bool)
	var result []RawTransaction
	for _, t := range aiTxns {
		date, err := time.Parse("2006-01-02", t.Date)
		if err != nil {
			continue
		}
		txType := t.Type
		if txType != "income" && txType != "expense" {
			txType = "expense"
		}
		key := fmt.Sprintf("%s|%.2f|%s", t.Date, t.Amount, t.Description)
		if seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, RawTransaction{
			Date:        date,
			Amount:      t.Amount,
			Description: t.Description,
			Type:        txType,
		})
	}
	log.Printf("[AI] image extraction → %d transactions", len(result))
	return result, nil
}

// extractJSON pulls the first complete JSON array or object out of an LLM response,
// ignoring any surrounding markdown, prose, or code fences.
func extractJSON(s string) string {
	// Find the first [ or {
	open := strings.IndexAny(s, "[{")
	if open == -1 {
		return s
	}
	closer := byte(']')
	if s[open] == '{' {
		closer = '}'
	}
	// Find the last matching closer
	close := strings.LastIndexByte(s, closer)
	if close <= open {
		return s
	}
	return s[open : close+1]
}

type TransactionInput struct {
	Description string
	Type        string // "income" or "expense"
}

const categorizeChunkSize = 50

// BatchCategorize sends transactions to the AI in chunks and returns a category per entry.
func (a *AIEnhancer) BatchCategorize(ctx context.Context, txns []TransactionInput, validCategories []string) []string {
	result := make([]string, len(txns))
	if a == nil || len(txns) == 0 {
		return result
	}
	catList := strings.Join(validCategories, ", ")
	for start := 0; start < len(txns); start += categorizeChunkSize {
		end := start + categorizeChunkSize
		if end > len(txns) {
			end = len(txns)
		}
		chunk := txns[start:end]

		var sb strings.Builder
		for i, t := range chunk {
			fmt.Fprintf(&sb, "%d. [%s] %s\n", i+1, t.Type, t.Description)
		}

		prompt := fmt.Sprintf(
			"You are a financial transaction categorizer for a Nigerian bank user.\n"+
				"Each transaction is labeled [income] (money received) or [expense] (money sent/spent).\n"+
				"Preferred categories (reuse these when they fit): %s\n"+
				"You may create a short new category name if none fit. Never assign 'Income' to an [expense] transaction.\n\n"+
				"Return ONLY a JSON array of strings — one category per transaction in the same order. No explanation.\n\n"+
				"Transactions:\n%s",
			catList,
			sb.String(),
		)

		text, err := a.generate(ctx, prompt)
		if err != nil {
			log.Printf("[AI] chunk %d-%d failed: %v", start, end, err)
			continue
		}

		var cats []string
		if err := json.Unmarshal([]byte(extractJSON(text)), &cats); err != nil {
			log.Printf("[AI] chunk %d-%d parse error: %v | raw: %.200s", start, end, err, text)
			continue
		}
		for i := 0; i < len(chunk) && i < len(cats); i++ {
			result[start+i] = cats[i]
		}
	}
	return result
}

type aiRawTransaction struct {
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	Type        string  `json:"type"`
}

const pdfChunkSize = 10_000 // chars per chunk — keeps requests under Groq's TPM limit

// ExtractTransactions splits large PDF text into chunks and merges results.
func (a *AIEnhancer) ExtractTransactions(ctx context.Context, rawText string) ([]RawTransaction, error) {
	if a == nil {
		return nil, fmt.Errorf("AI not available")
	}

	chunks := splitTextIntoChunks(rawText, pdfChunkSize)
	log.Printf("[AI] PDF split into %d chunk(s)", len(chunks))

	var all []RawTransaction
	seen := make(map[string]bool)

	for i, chunk := range chunks {
		if i > 0 {
			time.Sleep(2 * time.Second) // stay within Groq's per-minute token budget
		}
		prompt := fmt.Sprintf(
			"Extract all financial transactions from this bank statement text (part %d of %d).\n"+
				"Return a JSON array where each item has:\n"+
				"- \"date\": YYYY-MM-DD\n"+
				"- \"description\": transaction description/narration\n"+
				"- \"amount\": positive number, no currency symbols\n"+
				"- \"type\": \"income\" or \"expense\"\n\n"+
				"Skip headers, totals, and account summary rows. Only actual transaction rows.\n"+
				"If there are no transactions in this section return an empty array [].\n\n"+
				"Text:\n%s",
			i+1, len(chunks), chunk,
		)

		text, err := a.generate(ctx, prompt)
		if err != nil {
			log.Printf("[AI] chunk %d/%d failed: %v", i+1, len(chunks), err)
			continue
		}

		var aiTxns []aiRawTransaction
		if err := json.Unmarshal([]byte(extractJSON(text)), &aiTxns); err != nil {
			log.Printf("[AI] chunk %d/%d parse error: %v", i+1, len(chunks), err)
			continue
		}

		for _, t := range aiTxns {
			date, err := time.Parse("2006-01-02", t.Date)
			if err != nil {
				continue
			}
			txType := t.Type
			if txType != "income" && txType != "expense" {
				txType = "expense"
			}
			// Deduplicate by date+amount+description
			key := fmt.Sprintf("%s|%.2f|%s", t.Date, t.Amount, t.Description)
			if seen[key] {
				continue
			}
			seen[key] = true
			all = append(all, RawTransaction{
				Date:        date,
				Amount:      t.Amount,
				Description: t.Description,
				Type:        txType,
			})
		}
		log.Printf("[AI] chunk %d/%d → %d transactions", i+1, len(chunks), len(aiTxns))
	}

	return all, nil
}

// splitTextIntoChunks splits text into chunks of maxChars, breaking at newline boundaries.
func splitTextIntoChunks(text string, maxChars int) []string {
	if len(text) <= maxChars {
		return []string{text}
	}
	var chunks []string
	for len(text) > 0 {
		if len(text) <= maxChars {
			chunks = append(chunks, text)
			break
		}
		// Find the last newline within maxChars to avoid splitting mid-transaction
		cut := maxChars
		if idx := strings.LastIndexByte(text[:maxChars], '\n'); idx > maxChars/2 {
			cut = idx + 1
		}
		chunks = append(chunks, text[:cut])
		text = text[cut:]
	}
	return chunks
}
