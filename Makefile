# =============================================================================
# Expendit — Monorepo Makefile
# =============================================================================
# Usage: make <target>
#   Run `make help` to list all available targets.
#
# Structure:
#   api/common/             — Go backend (common)
#   web/                    — Next.js app (marketing + dashboard, combined)
#   deploy/docker/         — Docker Infrastructure / compose files currently in root directory for simplicity
#   web/k8s/                — Kubernetes manifests
# =============================================================================

.DEFAULT_GOAL := help
.PHONY: help install install-api install-web \
        dev dev-api dev-web \
        build build-api build-web \
        lint lint-api lint-web \
        test test-api test-web \
		setup-node docker-install \
        docker-up docker-up-d docker-down docker-build docker-logs \
        k8s-apply k8s-delete k8s-status \
        pre-push pre-push-web \
        clean clean-builds

# -----------------------------------------------------------------------------
# Colours
# -----------------------------------------------------------------------------
BOLD  := \033[1m
RESET := \033[0m
CYAN  := \033[36m
GREEN := \033[32m
GRAY  := \033[90m

# -----------------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------------
API_DIR      := api/common/
WEB_DIR      := web/
DOCKER_COMPOSE_DIR   := $(shell pwd)/.
K8S_DIR      := web/k8s/
COMPOSE_FILE := $(DOCKER_COMPOSE_DIR)/compose.yaml
CURRENT_USER := $(shell whoami)

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------
help: ## Show this help message
	@printf "\n$(BOLD)Expendit monorepo$(RESET)\n\n"
	@printf "$(CYAN)%-22s$(RESET) %s\n" "Target" "Description"
	@printf "$(GRAY)%-22s %s$(RESET)\n" "──────────────────────" "───────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@printf "\n"

# -----------------------------------------------------------------------------
# Install Build Tools ( Node, npm, Docker)
# -----------------------------------------------------------------------------
setup-node: ## Install Node.js & npm
	@printf "$(BOLD)Setting up development environment...$(RESET)\n"
	sudo apt install nodejs -y && sudo apt install npm -y
	@printf "$(GREEN)✓ Node.js and npm installed$(RESET)\n"

docker-install: ## Docker Installation
	@@printf "$(BOLD)Setting up Docker...$(RESET)\n"
	sudo apt update -y
	sudo apt install -y ca-certificates curl
	sudo install -m 0755 -d /etc/apt/keyrings
	sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
	sudo chmod a+r /etc/apt/keyrings/docker.asc

	@printf "$(BOLD)Adding Docker Repository...$(RESET)\n"
	echo "deb [arch=$$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $$(. /etc/os-release && echo "$${VERSION_CODENAME}") stable" | \
	sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

	@printf "$(BOLD)Installing Docker Engines...$(RESET)\n"
	sudo apt update -y
	sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

	@printf "$(BOLD)Enabling and Starting Services...$(RESET)\n"
	sudo systemctl enable docker
	sudo systemctl start docker

	@printf "$(BOLD)Running Post-Installation (User Groups)...$(RESET)\n"
	sudo groupadd docker || true
	sudo usermod -aG docker $(CURRENT_USER)
	newgrp docker
	@printf "$(GREEN)✓ Docker Installation Completed$(RESET)\n"

# -----------------------------------------------------------------------------
# Install — listed as dependencies, no recursive make calls
# -----------------------------------------------------------------------------
install: install-api install-web ## Install all workspace dependencies
	@printf "$(GREEN)✓ All dependencies installed$(RESET)\n"

install-api: ## Install CommonServer dependencies
	@printf "$(BOLD)Installing $(API_DIR)...$(RESET)\n"
	cd $(API_DIR) && npm install

install-web: ## Install web dependencies
	@printf "$(BOLD)Installing $(WEB_DIR)...$(RESET)\n"
	cd $(WEB_DIR) && npm install

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------
dev: ## Start all services in development mode (parallel)
	@printf "$(BOLD)Starting all services...$(RESET)\n"
	$(MAKE) -j2 dev-api dev-web

dev-api: ## Start api/nodejs dev server
	cd $(API_DIR) && npm run dev

dev-web: ## Start web dev server
	cd $(WEB_DIR) && npm run dev

# -----------------------------------------------------------------------------
# Build — compound target uses dependencies, no recursive make
# -----------------------------------------------------------------------------
build: build-api build-web ## Build all workspaces for production
	@printf "$(GREEN)✓ All builds complete$(RESET)\n"

build-api: ## Build api/nodejs
	@printf "$(BOLD)Building $(API_DIR)...$(RESET)\n"
	cd $(API_DIR) && npm run build

build-web: ## Build web
	@printf "$(BOLD)Building $(WEB_DIR)...$(RESET)\n"
	cd $(WEB_DIR) && npm run build

# -----------------------------------------------------------------------------
# Lint — dependencies, not recursive make
# -----------------------------------------------------------------------------
lint: lint-api lint-web ## Lint all workspaces
	@printf "$(GREEN)✓ Lint complete$(RESET)\n"

lint-api: ## Lint CommonServer
	cd $(API_DIR) && npm run lint

lint-web: ## Lint web
	cd $(WEB_DIR) && npm run lint:staged

# -----------------------------------------------------------------------------
# Test — dependencies, not recursive make
# -----------------------------------------------------------------------------
test: test-api test-web ## Run all tests
	@printf "$(GREEN)✓ All tests passed$(RESET)\n"

test-api: ## Run api/nodejs tests
	cd $(API_DIR) && npm test

test-web: ## Run web tests
	cd $(WEB_DIR) && npm test

# -----------------------------------------------------------------------------
# Docker
# -----------------------------------------------------------------------------
docker-up: ## Start all services via Docker Compose
	docker compose -f $(COMPOSE_FILE) up

docker-up-d: ## Start all services via Docker Compose (detached)
	docker compose -f $(COMPOSE_FILE) up -d

docker-down: ## Stop all Docker Compose services
	docker compose -f $(COMPOSE_FILE) down

docker-build: ## Build all Docker images
	docker compose -f $(COMPOSE_FILE) build

docker-logs: ## Tail logs from all containers
	docker compose -f $(COMPOSE_FILE) logs -f

# -----------------------------------------------------------------------------
# Kubernetes
# -----------------------------------------------------------------------------
k8s-apply: ## Apply all Kubernetes manifests
	kubectl apply -f $(K8S_DIR)/

k8s-delete: ## Delete all Kubernetes resources
	kubectl delete -f $(K8S_DIR)/

k8s-status: ## Show status of all Kubernetes deployments
	kubectl get deployments,services,pods

# -----------------------------------------------------------------------------
# Pre-push — reuses lint + test as dependencies, no recursive make
# -----------------------------------------------------------------------------
pre-push: lint test ## Run lint + test before push (used by Husky)
	@printf "$(GREEN)✓ Pre-push checks passed$(RESET)\n"

pre-push-web: ## Run pre-push checks for web
	cd $(WEB_DIR) && npm run pre-push

# -----------------------------------------------------------------------------
# Housekeeping
# -----------------------------------------------------------------------------
clean: ## Remove all build artifacts and node_modules
	@printf "$(BOLD)Cleaning all artifacts and node_modules...$(RESET)\n"
	rm -rf $(API_DIR)/dist $(API_DIR)/node_modules
	rm -rf $(WEB_DIR)/.next $(WEB_DIR)/node_modules
	@printf "$(GREEN)✓ Clean complete$(RESET)\n"

clean-builds: ## Remove build artifacts only (keep node_modules)
	@printf "$(BOLD)Cleaning build artifacts...$(RESET)\n"
	rm -rf $(API_DIR)/dist
	rm -rf $(WEB_DIR)/.next
	@printf "$(GREEN)✓ Build artifacts removed$(RESET)\n"
