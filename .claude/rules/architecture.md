# architecture.md

## Stack minimal
- **Next.js 14+** (App Router) — un seul `page.tsx`, pas de routing.
- **sql.js** (SQLite compilé en WebAssembly) — la base reste **côté navigateur**, zéro backend pour la DB.
- **TailwindCSS** — styling rapide et cohérent.
- **LLM local via Ollama** (`http://localhost:11434/api/generate`), deux modèles aux rôles séparés :
  - `qwen2.5-coder:7b` → génération SQL
  - `llama3.2:3b` → explication / phrase de réponse / fallback UX
- **Mock mode** activable par `MOCK_LLM=true` ou auto-détecté si Ollama est injoignable. L'app **doit** tourner sans Ollama.

## Pourquoi sql.js (pas better-sqlite3)
- Pas de backend à monter pour la base = -30 min de plomberie.
- L'utilisateur upload, le fichier vit en mémoire navigateur, lecture seule garantie.
- Cohérent avec le périmètre POC.

## Pourquoi Ollama local (pas une API cloud)
- Zéro clé API à gérer, zéro coût, zéro latence réseau.
- Confidentialité totale : aucune donnée ne quitte la machine — argument fort à la démo.
- Détail des modèles et du fallback : voir `llm.md`.

## Structure de fichiers
```
/app
  page.tsx              # Vue unique (single-page)
  layout.tsx
  api/
    ask/route.ts        # POST { question, schema } → { sql, answer }
                        #   1) qwen2.5-coder → SQL  2) exec sql.js  3) llama3.2 → phrase
/components
  FileUpload.tsx        # Drop zone .sqlite / .db
  TableList.tsx         # Sidebar avec libellés humanisés
  TableView.tsx         # Tableau de données paginé
  SearchBar.tsx         # Recherche LIKE multi-colonnes
  Assistant.tsx         # Panneau IA (input + réponse)
  ReadOnlyBadge.tsx     # Rappel permanent « Mode lecture seule »
  EmptyState.tsx        # États vides rassurants
/lib
  db.ts                 # Wrapper sql.js : load, listTables, getColumns, query
  introspect.ts         # Extraction schéma depuis sqlite_master
  humanize.ts           # snake_case/abbréviations → libellé FR
  llm.ts                # callOllama(model, prompt) + prompts SQL/explain + mock
/scripts
  setup-ollama.sh       # Optionnel, non bloquant : pull des 2 modèles
/public
  samples/
    pme.sqlite
    assoc.sqlite
```

## Composants clés
- **FileUpload** : drag & drop ou clic. Affiche le nom du fichier connecté.
- **TableList** : appelle `introspect()` puis `humanize()` pour chaque table.
- **TableView** : pagination simple (50 lignes), en-têtes humanisés, types affichés en pictos discrets (texte / nombre / date) — jamais le type SQL.
- **SearchBar** : recherche `LIKE %q%` sur toutes les colonnes textuelles de la table active.
- **Assistant** : envoie la question + le schéma JSON à `/api/ask`, affiche la réponse (tableau ou phrase).

## Data flow
```
Upload .sqlite
  → sql.js charge en mémoire
  → introspect() lit sqlite_master + PRAGMA table_info
  → humanize() génère libellés FR
  → UI affiche sidebar + zone principale
  → user clique table → SELECT * LIMIT 50 OFFSET n
  → user tape recherche → SELECT ... WHERE col LIKE ?
  → user pose question → /api/ask
       → qwen2.5-coder:7b génère SQL (Ollama)
       → validation regex anti-écriture
       → sql.js exécute en local
       → llama3.2:3b reformule en phrase FR (si utile)
       → réponse rendue (chiffre / tableau / phrase)
  → si Ollama injoignable → mock mode (heuristiques mots-clés)
```

## Stratégie d'introspection (générique)
1. `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
2. Pour chaque table : `PRAGMA table_info(<name>)` → colonnes + types.
3. Construire un objet `Schema` :
   ```ts
   type Schema = {
     tables: { name: string; label: string;
               columns: { name: string; label: string; type: 'text'|'number'|'date'|'bool' }[]
             }[]
   }
   ```
4. `humanize()` : règles simples :
   - retirer préfixes `tbl_`, `t_`, `usr_`...
   - remplacer `_` par espace, capitaliser
   - dictionnaire FR de fallback (`ord` → `commande`, `usr` → `utilisateur`, `prod` → `produit`, `qty` → `quantité`, `addr` → `adresse`, `dob` → `date de naissance`...)
   - **Bonus** : passer la liste au LLM en un seul appel pour raffiner (cache en localStorage).

## Sécurité côté LLM
- `qwen2.5-coder` reçoit **seulement le schéma** + la question. Jamais les données.
- `llama3.2` reçoit la question + un **résultat tronqué** (max 20 lignes) pour formuler la phrase.
- La requête générée est **validée** : refus si elle contient `INSERT|UPDATE|DELETE|DROP|ALTER|ATTACH|CREATE|REPLACE|PRAGMA`.
- Exécution locale via sql.js → impossible de toucher autre chose que le fichier en mémoire.
- Tout reste sur la machine (Ollama local) → zéro fuite réseau.

## Performance & contraintes
- Timeout Ollama : **5 s** par appel. Au-delà → fallback mock.
- Aucune orchestration multi-agents, aucun agent framework, aucune chaîne d'appels conditionnelle complexe.
- Maximum **2 appels LLM** par question utilisateur (1 SQL + 1 explication).
- Pas de streaming (`stream: false`) — simplicité avant tout.
- Pas de cache LLM v1 ; cache `localStorage` uniquement pour les libellés humanisés (bonus).

## Objectif
Rester **simple et générique**. Toute logique métier est inférée du schéma à l'exécution, jamais codée en dur.
