# =============================================================================
# Expendit — Monorepo Makefile
# =============================================================================
# Usage: make <target>
#   Run `make help` to list all available targets.
#
# Structure:
#   CommonServer/       — Go backend (CommonServer)
#   Home/              — Next.js root app (Home)
#   Home/dashboard/    — Next.js dashboard app (App)
#   Deploy/Docker/    — Docker Infrastructure / compose files currently in root directory for simplicity
#   App/k8s/       — Kubernetes manifests
# =============================================================================

.DEFAULT_GOAL := help
.PHONY: help install install-api install-web install-dashboard \
        dev dev-api dev-web dev-dashboard \
        build build-api build-web build-dashboard \
        lint lint-api lint-web lint-dashboard \
        test test-api test-web test-dashboard \
		setup-node docker-install \
        docker-up docker-up-d docker-down docker-build docker-logs \
        k8s-apply k8s-delete k8s-status \
        pre-push pre-push-web pre-push-dashboard \
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
API_DIR      := CommonServer/
WEB_DIR      := Home/
DASH_DIR     := Home/dashboard/
DOCKER_COMPOSE_DIR   := $(shell pwd)/.
K8S_DIR      := App/k8s/
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
install: install-api install-web install-dashboard ## Install all workspace dependencies
	@printf "$(GREEN)✓ All dependencies installed$(RESET)\n"

install-api: ## Install CommonServer dependencies
	@printf "$(BOLD)Installing $(API_DIR)...$(RESET)\n"
	cd $(API_DIR) && npm install

install-web: ## Install web dependencies
	@printf "$(BOLD)Installing $(WEB_DIR)...$(RESET)\n"
	cd $(WEB_DIR) && npm install

install-dashboard: ## Install web/dashboard dependencies
	@printf "$(BOLD)Installing $(DASH_DIR)...$(RESET)\n"
	cd $(DASH_DIR) && npm install

# -----------------------------------------------------------------------------
# Development
# -----------------------------------------------------------------------------
dev: ## Start all services in development mode (parallel)
	@printf "$(BOLD)Starting all services...$(RESET)\n"
	$(MAKE) -j3 dev-api dev-web dev-dashboard

dev-api: ## Start api/nodejs dev server
	cd $(API_DIR) && npm run dev

dev-web: ## Start web dev server
	cd $(WEB_DIR) && npm run dev

dev-dashboard: ## Start web/dashboard dev server
	cd $(DASH_DIR) && npm run dev

# -----------------------------------------------------------------------------
# Build — compound target uses dependencies, no recursive make
# -----------------------------------------------------------------------------
build: build-api build-web build-dashboard ## Build all workspaces for production
	@printf "$(GREEN)✓ All builds complete$(RESET)\n"

build-api: ## Build api/nodejs
	@printf "$(BOLD)Building $(API_DIR)...$(RESET)\n"
	cd $(API_DIR) && npm run build

build-web: ## Build web
	@printf "$(BOLD)Building $(WEB_DIR)...$(RESET)\n"
	cd $(WEB_DIR) && npm run build

build-dashboard: ## Build web/dashboard
	@printf "$(BOLD)Building $(DASH_DIR)...$(RESET)\n"
	cd $(DASH_DIR) && npm run build

# -----------------------------------------------------------------------------
# Lint — dependencies, not recursive make
# -----------------------------------------------------------------------------
lint: lint-api lint-web lint-dashboard ## Lint all workspaces
	@printf "$(GREEN)✓ Lint complete$(RESET)\n"

lint-api: ## Lint CommonServer
	cd $(API_DIR) && npm run lint

lint-web: ## Lint web
	cd $(WEB_DIR) && npm run lint:staged

lint-dashboard: ## Lint web/dashboard
	cd $(DASH_DIR) && npm run lint:staged

# -----------------------------------------------------------------------------
# Test — dependencies, not recursive make
# -----------------------------------------------------------------------------
test: test-api test-web test-dashboard ## Run all tests
	@printf "$(GREEN)✓ All tests passed$(RESET)\n"

test-api: ## Run api/nodejs tests
	cd $(API_DIR) && npm test

test-web: ## Run web tests
	cd $(WEB_DIR) && npm test

test-dashboard: ## Run web/dashboard tests
	cd $(DASH_DIR) && npm test

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

pre-push-web: ## Run pre-push checks for web only
	cd $(WEB_DIR) && npm run pre-push

pre-push-dashboard: ## Run pre-push checks for web/dashboard only
	cd $(DASH_DIR) && npm run pre-push

# -----------------------------------------------------------------------------
# Housekeeping
# -----------------------------------------------------------------------------
clean: ## Remove all build artifacts and node_modules
	@printf "$(BOLD)Cleaning all artifacts and node_modules...$(RESET)\n"
	rm -rf $(API_DIR)/dist $(API_DIR)/node_modules
	rm -rf $(WEB_DIR)/.next $(WEB_DIR)/node_modules
	rm -rf $(DASH_DIR)/.next $(DASH_DIR)/node_modules
	@printf "$(GREEN)✓ Clean complete$(RESET)\n"

clean-builds: ## Remove build artifacts only (keep node_modules)
	@printf "$(BOLD)Cleaning build artifacts...$(RESET)\n"
	rm -rf $(API_DIR)/dist
	rm -rf $(WEB_DIR)/.next
	rm -rf $(DASH_DIR)/.next
	@printf "$(GREEN)✓ Build artifacts removed$(RESET)\n"
