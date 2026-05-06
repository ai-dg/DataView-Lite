---
name: ollama-setup
description: Installe Ollama (si absent) et pull les deux modèles requis par DataView Lite (qwen2.5-coder:7b pour le SQL, llama3.2:3b pour les explications). Optionnel et non bloquant — l'app marche en mock mode sans Ollama.
---

# Skill : ollama-setup

## Objectif
Préparer l'environnement LLM local **sans jamais bloquer** la démo. Si quoi que ce soit échoue, on retombe sur le mock mode.

## Étapes

### 1. Vérifier la présence d'Ollama
```bash
command -v ollama || echo "ℹ️  Ollama absent — l'app fonctionnera en mock mode."
```
Si absent, suggérer (ne pas forcer) :
- macOS : `brew install ollama`
- Linux : `curl -fsSL https://ollama.com/install.sh | sh`
- Windows / autre : https://ollama.com/download

### 2. Démarrer le serveur (si nécessaire)
```bash
pgrep -x ollama >/dev/null || ollama serve &
```

### 3. Puller les deux modèles
```bash
ollama pull qwen2.5-coder:7b   # ~4.7 Go — génération SQL
ollama pull llama3.2:3b        # ~2.0 Go — explications / chatbot
```

### 4. Vérification rapide
```bash
curl -s http://localhost:11434/api/tags | grep -E "qwen2.5-coder|llama3.2" || echo "⚠️  Modèles non détectés."
```

### 5. Script complet (à placer dans `scripts/setup-ollama.sh`)
```bash
#!/usr/bin/env bash
# Optionnel et non bloquant. Sortie 0 même en cas d'échec partiel.
set +e

if ! command -v ollama >/dev/null 2>&1; then
  echo "ℹ️  Ollama n'est pas installé."
  echo "   Installation : https://ollama.com/download"
  echo "   L'app fonctionnera en mode mock sans Ollama."
  exit 0
fi

pgrep -x ollama >/dev/null || (ollama serve & sleep 2)

ollama pull qwen2.5-coder:7b || echo "⚠️  qwen2.5-coder:7b non récupéré — mock SQL activé."
ollama pull llama3.2:3b      || echo "⚠️  llama3.2:3b non récupéré — réponses brutes activées."

echo "✅ Setup terminé."
exit 0
```
```bash
chmod +x scripts/setup-ollama.sh
```

## Garde-fous
- **Jamais de `sudo`**.
- **Jamais d'install silencieuse**.
- `exit 0` toujours, même en cas d'échec.
- Si Ollama injoignable au runtime → `MOCK_LLM=true` automatique côté app.

## Référence
- `rules/llm.md` — pipeline et fallback.
- `rules/constraints.md` — règles d'or anti-blocage.
