# llm.md

## Objectif
Permettre à l'utilisateur de poser une question en **français naturel** et obtenir une réponse lisible, sans jamais voir de SQL.

Exemples cibles (PDF) :
- *« Combien de commandes en mars ? »*
- *« Montre-moi les clients de Lyon »*
- *« C'est quoi cette table ? »*
- *« Qui n'a pas payé sa cotisation ? »*

## Stratégie LLM (CRITIQUE) — Ollama local, 2 modèles

L'app utilise **Ollama** en local. **Deux modèles**, **deux rôles distincts**, **jamais mélangés**.

| Modèle | Rôle exclusif | Quand l'appeler |
|---|---|---|
| `qwen2.5-coder:7b` | **Génération SQL** (NL → SQL) | À chaque question utilisateur, et pour le raffinement des libellés. |
| `llama3.2:3b` | **Explication / chatbot / fallback UX** | Formuler la phrase de réponse, reformuler une demande de précision, résumer une table. |

Règle d'or :
- ❌ **Jamais** demander du SQL à `llama3.2`.
- ❌ **Jamais** demander une explication chaleureuse à `qwen2.5-coder`.
- ✅ Pipeline : `qwen2.5-coder` produit le SQL → exécution locale sql.js → `llama3.2` formule la phrase de réponse à partir du résultat.

## Intégration Ollama (simple, pas de SDK)
- Endpoint unique : `POST http://localhost:11434/api/generate`
- Body : `{ "model": "...", "prompt": "...", "stream": false, "format": "json" }`
- Un seul wrapper dans `lib/llm.ts` : `callOllama(model, prompt, opts?)`.
- Pas d'orchestrateur, pas de file d'attente, pas de retry exponentiel — appel direct.

## Pipeline (NL → SQL → exécution locale → réponse lisible)

```
Question utilisateur
     ↓
[lib/llm.ts] callOllama("qwen2.5-coder:7b", sqlPrompt(schema, question))
     ↓ JSON { sql, displayHint }
Validation regex (lecture seule)
     ↓
sql.js exécute en local
     ↓
[lib/llm.ts] callOllama("llama3.2:3b", explainPrompt(question, rows))   ← optionnel si displayHint=number
     ↓
Affichage UI selon displayHint :
  - "number"   → gros chiffre + phrase llama3.2
  - "table"    → tableau humanisé (pas d'appel llama3.2 nécessaire)
  - "sentence" → phrase llama3.2
  - "clarify"  → message llama3.2 + suggestions
```

## Prompt SQL (qwen2.5-coder:7b)

```
Tu génères du SQL SQLite en LECTURE SEULE pour une base dont voici le schéma.

Règles strictes :
1. SELECT uniquement. Interdits : INSERT, UPDATE, DELETE, DROP, ALTER, ATTACH, CREATE, REPLACE.
2. Utilise EXACTEMENT les noms de tables/colonnes du schéma fourni.
3. LIMIT 100 par défaut.
4. Réponds UNIQUEMENT en JSON valide, sans markdown, sans commentaire.

Format de sortie :
{
  "sql": "SELECT ...",
  "displayHint": "number" | "table" | "sentence" | "clarify",
  "suggestions": ["..."]   // uniquement si "clarify"
}

SCHÉMA : { ... }
QUESTION : "..."
```

## Prompt explication (llama3.2:3b)

```
Tu réponds en français à un utilisateur non technique (Martine, 54 ans, peur de casser).
Reformule le résultat en UNE phrase claire, chaleureuse, sans jargon, sans SQL, sans nom de colonne brut.

QUESTION : "..."
RÉSULTAT (JSON) : [...]

Réponds par une seule phrase en français.
```

## Validation côté serveur (anti-écriture, NON négociable)
```ts
const FORBIDDEN = /\b(insert|update|delete|drop|alter|attach|create|replace|truncate|pragma)\b/i;
if (FORBIDDEN.test(sql)) return fallbackClarify();
```

## Stratégie de fallback (l'app ne casse JAMAIS)

Niveaux de dégradation, du meilleur au pire :

1. **Ollama OK + 2 modèles dispo** → pipeline complet ci-dessus.
2. **Ollama OK mais `llama3.2` absent** → réponse brute formatée par l'UI (pas de phrase, juste tableau/chiffre).
3. **Ollama OK mais `qwen2.5-coder` absent** → bascule mock SQL (mots-clés simples : *combien*, *liste*, *qui*).
4. **Ollama injoignable** (timeout 5 s, ECONNREFUSED) → **mock mode complet** (voir ci-dessous).
5. **SQL renvoyé invalide à l'exécution** → message doux + suggestion de reformuler ou d'utiliser la recherche.

Règle : **toute exception est attrapée**, l'utilisateur voit un message en français, jamais une stack trace.

## Mock mode (OBLIGATOIRE — l'app doit tourner sans Ollama)

Variable d'env : `MOCK_LLM=true` (ou détection auto si `localhost:11434` ne répond pas au démarrage).

Comportement mock :
- Détection de mots-clés FR (`combien`, `liste`, `montre`, `qui`, `quoi`, `cette table`).
- Génération SQL heuristique :
  - `combien de <table>` → `SELECT COUNT(*) FROM <table>`
  - `liste/montre <table>` → `SELECT * FROM <table> LIMIT 50`
  - `<table> de <ville>` → recherche `LIKE` sur colonnes texte
- Phrase de réponse : template figé (`"Il y a {n} {table}."`).
- Suggestions pré-câblées sur les 2 bases de démo.

**Le mock garantit la démo même hors-ligne, sans Ollama installé.**

## Script de setup (optionnel, non bloquant)

`scripts/setup-ollama.sh` :
```bash
#!/usr/bin/env bash
# Optionnel : prépare Ollama pour DataView Lite. Ne casse JAMAIS l'app si échec.
set +e

if ! command -v ollama >/dev/null 2>&1; then
  echo "ℹ️  Ollama n'est pas installé."
  echo "   Installation : https://ollama.com/download"
  echo "   L'app fonctionnera en mode mock sans Ollama."
  exit 0
fi

ollama pull qwen2.5-coder:7b || echo "⚠️  qwen2.5-coder:7b non récupéré — mock SQL activé."
ollama pull llama3.2:3b      || echo "⚠️  llama3.2:3b non récupéré — réponses brutes activées."

echo "✅ Setup terminé. Lance 'ollama serve' si ce n'est pas déjà fait."
exit 0
```

Règles du script :
- **Optionnel** : l'app marche sans l'avoir lancé.
- **Non bloquant** : `exit 0` même en cas d'échec partiel.
- **Pas de sudo**, pas d'install silencieuse.

## Affichage des réponses
- **number** : chiffre en grand + phrase llama3.2 en dessous.
- **table** : `TableView` réutilisé, en-têtes humanisés.
- **sentence** : phrase llama3.2 seule.
- **clarify** : message + 3 suggestions cliquables qui pré-remplissent l'input.

## Sécurité & confidentialité
- Le LLM reçoit le **schéma** + la **question**. Jamais les **données**, sauf pour `llama3.2` qui reçoit un **résultat tronqué (max 20 lignes)** pour la phrase de réponse.
- Tout est **local** (Ollama) → aucune donnée ne sort de la machine. Argument fort pour la démo.

## Bonus IA (si temps)
- Humanisation des libellés via `qwen2.5-coder` (un seul appel batch, cache `localStorage` par hash de schéma).
- Résumé de table via `llama3.2`.
- Suggestions de questions contextuelles via `llama3.2`.

## Règle d'or
- Le SQL ne doit **jamais** apparaître à l'utilisateur.
- L'app ne doit **jamais** crasher à cause du LLM.
- Pas d'orchestration multi-agents, pas de chaîne complexe : **un appel SQL, un appel explication, point.**
