# Overview

Expendit is an open-source expense-tracking application — record expenses,
categorize them, import statements, and generate real-time reports. This
document describes the high-level architecture and each component's
responsibilities. To run the stack locally, see [setup.md](setup.md).

## Architecture

```
                 +---------------------+
                 |   Next.js web app   |
                 |       (web/)        |
                 +----------+----------+
                            |
                            | HTTP (REST)
                            v
+----------------+   +------+------------------+   +----------------+
| Flutter mobile |-->|   Go REST API (Gin)     |-->|    MongoDB     |
| (mobile/, WIP) |   |     (api/common/)       |   |                |
+----------------+   +------+------------------+   +----------------+
                            |
              +-------------+--------------+
              |             |              |
              v             v              v
          Redis        SMTP email    Google / Gemini
        (rate limit)                  (OAuth + AI)
```

- **`web`** — Next.js marketing site + authenticated dashboard (React,
  TypeScript). Talks to the API over HTTP (REST).
- **`mobile`** — Flutter app + native shells (`mobile/{flutter,android,ios}`),
  placeholders today, consuming the same API.
- **`api/common`** — Go service (module `expendit-server`, Gin): the source of
  truth for auth/users, expenses/income/categories, statement imports (CSV/PDF
  parsing, dedup, categorization), AI-assisted summaries (Gemini/Groq), and
  reporting.
- **Auth** — JWT (`golang-jwt`) plus Google OAuth.
- **Data** — MongoDB (records); Redis for rate limiting (in-memory fallback).

Backend services are named by **function**, never by language: the current
service is `api/common`; a future one would be `api/<function>`. See the
[repository structure](../README.md#repository-structure) in the README.
