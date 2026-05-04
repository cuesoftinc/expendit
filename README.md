## Expendit

## About

Expendit is a web application designed to simplify the task of estimating and tracking personal or business expenses. With an easy-to-use interface, the app allows users to input expenses on the go, categorize them, and generate real-time reports for better financial management. Whether you're looking to keep tabs on daily expenditures, plan a budget, or analyze spending trends, Expendit offers a range of features to help you achieve your financial goals. Its cloud-based architecture ensures that your data is accessible from any device, making it a convenient and reliable tool for expense management.

## Repository Structure
```
expendit/
├── api/
│   ├── go/               # Go REST API service
│   ├── python/           # Python service (analytics / ML)
│   └── nodejs/           # Node.js service (auth / webhooks)
├── app/
│   ├── android/          # Native Android app
│   ├── ios/              # Native iOS app
│   └── flutter/          # Flutter cross-platform app
├── web/
│   ├── /                 # Marketing / landing page
│   ├── dashboard/        # Web dashboard (Next.js)
│   └── supabase/         # Supabase schema & migrations
├── deploy/
│   ├── docker/           # Docker Compose configs
│   ├── helm/             # Kubernetes Helm charts
│   └── terraform/        # Infrastructure as Code (AWS / GCP)
├── docs/                 # Architecture, API refs, guides
├── scripts/              # Dev, CI, and release scripts
└── .github/
    ├── ISSUE_TEMPLATE/   # Bug report & feature request templates
    └── workflows/        # GitHub Actions CI/CD pipelines
```

## tech stack

| Layer | Technology |
| --- | --- |
| Mobile | Flutter, Android (Kotlin), iOS (Swift) |
| Web | Next.js, Supabase |
| API | Go, Python, Node.js |
| Datbase | PostgreSQL (via Supabase) |
| Infrastructure | Docker, Helm, Terraform |
| CI/CD | Github Actions |

## To Get Started

- [Git](https://git-scm.com)
- [Docker](https://www.docker.com/) & Docker Compose
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (for mobile)
- [Node.js](https://nodejs.org/) v18+ (for web and Node.js API)
- [Go](https://go.dev/) 1.21+ (for Go API)

  ## Setup
  ```bash
  # 1. clone the repo
  git clone https://github.com/cuesoftinc/expendit.git
  cd expendit

  # 2. Install all dependencies
  make setup

  # 3. Copy environment variables
  cp .env.example .env      #fill in your values in .env

  # 4. start all services locally
  make dev
  ```

  ## Contributing
  We welcome contributions of all kinds - bug fixes, new features, documentation, translations, and more.
  Please read our Contribution Guide (./CONTRIBUTING.md) before opening a PR.
  For first time contributors, look for issues labelled [`good first issue`](https://github.com/cuesoftinc/expendit/labels/good%20first%20issue).

  ## Documentation
  Full documentation lives in the [`/docs`](./docs/) folder and covers:
  - Architecture overview
  - API reference
  - Local development setup
  - Deployment guide
 
  ## License
  Expendit is open-source software licensed under the [MIT License](./LICENSE)

  ## Community
  [GitHub Discussions](https://github.com/cuesoftinc/expendit/discussions)
  [Report a bug](https://github.com/cuesoftinc/expendit/issues/new?template=bug_report.md)
  [Request a feature](https://github.com/cuesoftinc/expendit/issues/new?template=feature_request.md)
