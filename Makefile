# CueLABS™ standard Makefile — compose-driven local development + terraform deploy.
# Run `make help` to list targets.
.DEFAULT_GOAL := help
.PHONY: help up down build rebuild logs ps restart clean mobile-goldens tf-init tf-plan tf-apply tf-destroy

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN{FS=":.*## "};{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

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

mobile-goldens: ## Regenerate mobile CI goldens on Linux when mobile is implemented
	@test -x mobile/flutter/tool/update_goldens.sh || (echo "mobile-goldens is unavailable until mobile/flutter/tool/update_goldens.sh exists" >&2; exit 2)
	cd mobile/flutter && ./tool/update_goldens.sh

tf-init: ## Init terraform (deploy/terraform)
	terraform -chdir=deploy/terraform init

tf-plan: tf-init ## Preview the Kubernetes deployment
	terraform -chdir=deploy/terraform plan

tf-apply: tf-init ## Deploy the helm chart to the kubeconfig cluster
	terraform -chdir=deploy/terraform apply

tf-destroy: ## Tear down the deployed release
	terraform -chdir=deploy/terraform destroy
