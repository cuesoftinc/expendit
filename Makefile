# CueLABS standard Makefile — compose-driven local development.
# Run `make help` to list targets.
.DEFAULT_GOAL := help
.PHONY: help up down build rebuild logs ps restart clean

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Build and start the full stack (detached)
	docker compose up --build -d

down: ## Stop and remove the stack
	docker compose down

build: ## Build all service images
	docker compose build

rebuild: ## Rebuild images from scratch (no cache)
	docker compose build --no-cache

logs: ## Follow logs from all services
	docker compose logs -f

ps: ## Show service status
	docker compose ps

restart: ## Restart all services
	docker compose restart

clean: ## Stop the stack and remove volumes + orphans
	docker compose down -v --remove-orphans
