SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# DataView Lite — Makefile
#
# Loads .env (falls back to .env.example, then to safe defaults).
# Boots Ollama if installed, but never blocks the app: missing Ollama or
# missing models simply trigger the in-app mock/fallback mode.
# ---------------------------------------------------------------------------

# Sourced at the top of every recipe that needs LLM config.
# Bash treats "KEY=value # comment" lines correctly (the # after a space is a
# comment), so the project's .env can stay human-readable.
ENV_LOADER := set -a; \
  if [ -f .env ]; then . ./.env; \
  elif [ -f .env.example ]; then . ./.env.example; \
  fi; set +a; \
  OLLAMA_BASE_URL="$${OLLAMA_BASE_URL:-http://localhost:11434}"; \
  OLLAMA_SQL_MODEL="$${OLLAMA_SQL_MODEL:-qwen2.5-coder:7b}"; \
  OLLAMA_CHAT_MODEL="$${OLLAMA_CHAT_MODEL:-llama3.2:3b}";

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
help:
	@echo "DataView Lite — available commands:"
	@echo ""
	@echo "  make dev          Run everything: env, checks, install, Ollama, next dev"
	@echo "  make env          Create .env from .env.example if missing"
	@echo "  make check-node   Verify Node.js is installed"
	@echo "  make check-npm    Verify npm is installed"
	@echo "  make install      npm install if node_modules is missing"
	@echo "  make check-ollama Detect Ollama (warning only if absent)"
	@echo "  make ollama-serve Start 'ollama serve' if not already running"
	@echo "  make ollama-pull  Pull required Ollama models (best effort)"
	@echo "  make build        next build"
	@echo "  make start        next start"
	@echo "  make clean        Remove node_modules and .next"

# ---------------------------------------------------------------------------
# Environment file
# ---------------------------------------------------------------------------
env:
	@if [ -f .env ]; then \
	  echo "✅ .env present"; \
	elif [ -f .env.example ]; then \
	  cp .env.example .env; \
	  echo "✅ .env created from .env.example"; \
	else \
	  echo "⚠️  No .env nor .env.example — falling back to safe Ollama defaults."; \
	fi

# ---------------------------------------------------------------------------
# Tooling checks
# ---------------------------------------------------------------------------
check-node:
	@if ! command -v node >/dev/null 2>&1; then \
	  echo "❌ Node.js is missing. Install it from https://nodejs.org and retry."; \
	  exit 1; \
	fi; \
	echo "✅ Node.js $$(node -v)"

check-npm:
	@if ! command -v npm >/dev/null 2>&1; then \
	  echo "❌ npm is missing. It usually ships with Node.js — reinstall Node.js."; \
	  exit 1; \
	fi; \
	echo "✅ npm $$(npm -v)"

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
install:
	@if [ ! -d node_modules ]; then \
	  echo "📦 Installing dependencies (npm install)…"; \
	  if ! npm install; then \
	    echo "❌ npm install failed."; \
	    exit 1; \
	  fi; \
	  echo "✅ Dependencies installed"; \
	else \
	  echo "✅ node_modules already present"; \
	fi

# ---------------------------------------------------------------------------
# Ollama (optional, never blocking)
# ---------------------------------------------------------------------------
check-ollama:
	@if command -v ollama >/dev/null 2>&1; then \
	  echo "✅ Ollama detected ($$(ollama --version 2>/dev/null | head -n1))"; \
	else \
	  echo "⚠️  Ollama is not installed — the app will run in mock/fallback mode."; \
	  echo "   Install (optional): https://ollama.com/download"; \
	fi

ollama-serve:
	@$(ENV_LOADER) \
	if ! command -v ollama >/dev/null 2>&1; then \
	  echo "⚠️  Ollama not installed — skipping serve."; \
	  exit 0; \
	fi; \
	if curl -s -f -o /dev/null "$$OLLAMA_BASE_URL/api/tags"; then \
	  echo "✅ Ollama server reachable at $$OLLAMA_BASE_URL"; \
	  exit 0; \
	fi; \
	echo "⏳ Starting 'ollama serve' in the background…"; \
	(nohup ollama serve >/tmp/dataview-ollama.log 2>&1 &) ; \
	for i in 1 2 3 4 5 6 7 8 9 10; do \
	  sleep 1; \
	  if curl -s -f -o /dev/null "$$OLLAMA_BASE_URL/api/tags"; then \
	    echo "✅ Ollama server is up (logs: /tmp/dataview-ollama.log)"; \
	    exit 0; \
	  fi; \
	done; \
	echo "⚠️  Could not reach Ollama after 10 s — the app will use mock mode."

ollama-pull:
	@$(ENV_LOADER) \
	if ! command -v ollama >/dev/null 2>&1; then \
	  echo "⚠️  Ollama not installed — skipping model pull."; \
	  exit 0; \
	fi; \
	if ! curl -s -f -o /dev/null "$$OLLAMA_BASE_URL/api/tags"; then \
	  echo "⚠️  Ollama server not reachable — skipping model pull."; \
	  exit 0; \
	fi; \
	echo "📥 Pulling SQL model: $$OLLAMA_SQL_MODEL"; \
	if ! ollama pull "$$OLLAMA_SQL_MODEL"; then \
	  echo "⚠️  Pull of $$OLLAMA_SQL_MODEL failed — SQL mock will be used."; \
	fi; \
	if [ "$$OLLAMA_SQL_MODEL" = "$$OLLAMA_CHAT_MODEL" ]; then \
	  echo "ℹ️  SQL and chat models are identical — second pull skipped."; \
	else \
	  echo "📥 Pulling chat model: $$OLLAMA_CHAT_MODEL"; \
	  if ! ollama pull "$$OLLAMA_CHAT_MODEL"; then \
	    echo "⚠️  Pull of $$OLLAMA_CHAT_MODEL failed — raw responses will be shown."; \
	  fi; \
	fi

# ---------------------------------------------------------------------------
# Next.js lifecycle
# ---------------------------------------------------------------------------
dev: env check-node check-npm install check-ollama ollama-serve ollama-pull
	@echo ""
	@echo "🚀 Starting Next.js dev server…"
	@npm run dev

build: check-node check-npm install
	@echo "🏗  Building Next.js…"
	@npm run build

start: check-node check-npm
	@echo "▶  Starting Next.js (production)…"
	@npm run start

clean:
	@rm -rf node_modules .next
	@echo "✅ node_modules and .next removed"

.PHONY: help env check-node check-npm install check-ollama ollama-serve ollama-pull dev build start clean
