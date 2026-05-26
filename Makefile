# Variables
NPM = npm

# Colors for output/help messages
BLUE   = \033[36m
GREEN  = \033[32m
RESET  = \033[0m

.PHONY: all help install dev build preview clean restart

all: help

help: ## Show this help message
	@echo "Neon Survivors - Development Makefile"
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(RESET) %s\n", $$1, $$2}'

install: ## Install all project dependencies
	@echo "$(GREEN)Installing dependencies...$(RESET)"
	$(NPM) install

dev: ## Run the local development server (Vite)
	@echo "$(GREEN)Starting development server...$(RESET)"
	$(NPM) run dev

build: ## Build the production application bundle
	@echo "$(GREEN)Building production bundle...$(RESET)"
	$(NPM) run build

preview: ## Preview the production build locally
	@echo "$(GREEN)Previewing production build...$(RESET)"
	$(NPM) run preview

clean: ## Remove build artifacts and node_modules
	@echo "$(GREEN)Cleaning build files and node_modules...$(RESET)"
	rm -rf dist node_modules package-lock.json

restart: ## Clean install and start the dev server
	@echo "$(GREEN)Restarting project...$(RESET)"
	@$(MAKE) clean
	@$(MAKE) install
	@$(MAKE) dev
