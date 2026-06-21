## To run the  CommonServer

- go mod tidy 
- go run main.go



## url endpoints
post - http://localhost:9000/users/signup
post - http://localhost:9000/users/signin
get - http://localhost:9000/users
get - http://localhost:9000/user_id


## Rate Limiting

Login and password reset endpoints are rate-limited per IP using a sliding window (5 login attempts / 3 password reset attempts per 15 minutes).

By default the limiter runs **in-memory** — no setup required. To switch to a **Redis-backed** limiter that persists across restarts and works across multiple server instances, add one variable to `.env`:

```env
REDIS_URL=redis://localhost:6379              # local
REDIS_URL=redis://default:password@host:6379  # production (Upstash, Railway, Render, etc.)
```

The server pings Redis on startup. If the URL is missing or Redis is unreachable, it logs a warning and falls back to in-memory automatically — the app keeps running either way.

---

## Packages to install 
go get github.com/dgrijalva/jwt-go
 go get github.com/gin-gonic/gin
 go get github.com/go-playground/validator/v10

 
  ## Adding a New AI Provider

  The AI layer (`api/common/services/aiEnhancer.go`) supports swappable providers via env vars.
  Priority order: `GROQ_API_KEY` → `GEMINI_API_KEY`. To add a new provider (e.g. OpenAI, Claude):

  **1. `api/common/.env` — add the API key**
  ```
  OPENAI_API_KEY=sk-...
  # or
  ANTHROPIC_API_KEY=sk-ant-...
  ```

  **2. `aiEnhancer.go` — `NewAIEnhancer()` (line ~24)** — add an env var check:
  ```go
  if key := os.Getenv("OPENAI_API_KEY"); key != "" {
      log.Printf("[AI] using OpenAI")
      return &AIEnhancer{provider: "openai", apiKey: key, client: &http.Client{Timeout: 30 * time.Second}}
  }
  ```

  **3. `aiEnhancer.go` — `generate()` (line ~275)** — add a case for text generation:
  ```go
  case "openai":
      return a.generateOpenAI(ctx, prompt)
  ```

  **4. `aiEnhancer.go` — `GenerateText()` (line ~212)** — add a case for short summaries:
  ```go
  case "openai":
      return a.generateOpenAIWithTokens(ctx, prompt, 512)
  ```

  **5. `aiEnhancer.go` — `ExtractTransactionsFromImage()` (line ~478)** — add a case for image/vision:
  ```go
  case "openai":
      text, err = a.generateOpenAIVision(ctx, imageData, mimeType, imageTransactionPrompt)
  ```

  **6.** Add the actual `generateOpenAI()`, `generateOpenAIWithTokens()`, and `generateOpenAIVision()` functions
  alongside the existing Groq and Gemini implementations in the same file.

  > No other files need touching. The `.env` key controls which provider is active at runtime.

  ### Default provider
  The provider whose key appears **first** in `NewAIEnhancer()` and is set in `.env` wins. Current order: `GROQ_API_KEY` → `GEMINI_API_KEY`. Insert your new key check before or after existing ones to control priority. If multiple keys are set, only the first match is used.

  ### Provider comparison

  | Provider | Free tier | Vision | Data used for training |
  | --- | --- | --- | --- |
  | Groq | Yes | Yes (Llama 4) | No |
  | Gemini (AI Studio) | Yes | Yes | Yes (opt-out available) |
  | Gemini (Vertex AI) | No | Yes | No |
  | OpenAI | No | Yes (GPT-4o) | No |
  | Anthropic (Claude) | No | Yes | No |