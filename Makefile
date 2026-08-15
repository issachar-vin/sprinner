DEV_PORT  ?= 5173
PROD_PORT ?= 8080
COMPOSE   := docker compose
RUN_DEV   := $(COMPOSE) run --rm --no-deps dev

export DEV_PORT
export PROD_PORT

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# ---- setup -------------------------------------------------------------------

.PHONY: setup
setup: ## Build the dev image and install dependencies
	$(COMPOSE) build dev
	@command -v pre-commit >/dev/null 2>&1 && pre-commit install || \
		echo "pre-commit not installed on host; skipping hook install"

# ---- dev ---------------------------------------------------------------------

.PHONY: dev
dev: ## Run the dev server with hot reload (http://localhost:$(DEV_PORT))
	# --renew-anon-volumes: compose re-attaches the old anonymous node_modules
	# volume when it recreates the container, which shadows the freshly built
	# image and hides any dependency added since the last run.
	$(COMPOSE) up --build --renew-anon-volumes dev

.PHONY: down
down: ## Stop and remove containers
	$(COMPOSE) down

.PHONY: logs
logs: ## Tail dev server logs
	$(COMPOSE) logs -f dev

.PHONY: shell
shell: ## Open a shell in the dev container
	$(RUN_DEV) sh

# ---- quality -----------------------------------------------------------------

.PHONY: test
test: ## Run unit tests
	$(RUN_DEV) npm run test

.PHONY: test-watch
test-watch: ## Run unit tests in watch mode
	$(RUN_DEV) npm run test:watch

.PHONY: lint
lint: ## Run eslint
	$(RUN_DEV) npm run lint

.PHONY: typecheck
typecheck: ## Run the TypeScript compiler
	$(RUN_DEV) npm run typecheck

.PHONY: format
format: ## Rewrite files with prettier
	$(RUN_DEV) npm run format

.PHONY: check
check: lint typecheck test ## Run lint, typecheck and tests

# ---- production --------------------------------------------------------------

.PHONY: prod
prod: ## Build and serve the production bundle (http://localhost:$(PROD_PORT))
	$(COMPOSE) up --build prod

.PHONY: build
build: ## Build the production image without running it
	$(COMPOSE) build prod

.PHONY: ghcr
ghcr: ## Run the published GHCR image (http://localhost:$(PROD_PORT))
	$(COMPOSE) -f docker-compose.ghcr.yml up

# ---- housekeeping ------------------------------------------------------------

.PHONY: install
install: ## Regenerate package-lock.json after changing package.json
	$(RUN_DEV) npm install

.PHONY: clean
clean: ## Remove containers, volumes and build output
	$(COMPOSE) down -v --remove-orphans
	rm -rf dist coverage
