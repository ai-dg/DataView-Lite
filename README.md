# DataView Lite

Un explorateur de bases **SQLite** pensé pour les utilisateurs **non techniques**, avec un assistant en **langage naturel** (français). Importez n'importe quel fichier `.sqlite` ou `.db`, l'application en déduit la structure, humanise les libellés et permet de chercher, lire et exporter — sans jamais voir une ligne de SQL.

> POC réalisé dans le cadre d'un test technique de 2 heures. Priorité : UX claire, généricité, démo fiable.

---

## Démarrage rapide

```bash
make dev
```

Le `Makefile` :
1. crée `.env` depuis `.env.example` si besoin (sinon valeurs par défaut),
2. vérifie Node.js et npm,
3. installe les dépendances si nécessaire,
4. démarre Ollama en tâche de fond et tire les modèles si Ollama est installé,
5. lance `next dev`.

Alternative manuelle :

```bash
npm install
npm run dev
```

L'app fonctionne **sans Ollama** (mode démo automatique).

---

## Variables d'environnement

Le fichier `.env` (créé automatiquement depuis `.env.example` si absent) contient :

```env
LLM_SQL_PROVIDER=ollama
LLM_CHAT_PROVIDER=ollama

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_SQL_MODEL=qwen2.5-coder:7b
OLLAMA_CHAT_MODEL=llama3.2:3b

OPENAI_API_KEY=
OPENAI_SQL_MODEL=gpt-4o-mini
OPENAI_CHAT_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=
ANTHROPIC_SQL_MODEL=claude-3-haiku
ANTHROPIC_CHAT_MODEL=claude-3-haiku

LLM_TIMEOUT=30
LLM_MODE=auto
```

- `LLM_MODE=auto` (défaut) : tente Ollama, retombe sur le mode mock si injoignable.
- `LLM_MODE=mock` : force le mode démo, utile pour présenter sans dépendance réseau.
- **OpenAI et Anthropic sont optionnels.** Les variables sont prévues pour brancher d'autres fournisseurs plus tard ; ce POC n'embarque que le client Ollama et le mock.

---


## Choix techniques

- **Next.js 14 (App Router)** — single-page, une seule URL, pas de routing.
- **better-sqlite3** — natif, ouvert en `readonly: true`, idéal pour un POC sans serveur de DB.
- **Tailwind CSS** — styling minimal, pas de librairie UI.
- **Ollama local** par défaut : `qwen2.5-coder:7b` pour le SQL, `llama3.2:3b` pour les explications. Aucune donnée ne quitte la machine.
- **Heuristiques de libellés** : préfixes (`tbl_`, `usr_`, …), abréviations (`ord` → commande, `qty` → quantité…), dictionnaire FR extensible. **Raffinement Qwen** en arrière-plan au chargement (un appel batch, sanitisation côté serveur, cache `localStorage` par hash de schéma). **Raffinement Llama** : réponse plus humanisée, contrôle du résultat de Qwen.
- **Contexte global** : `SchemaContextBuilder` interroge Qwen une fois après upload pour produire `{ domain, summary, tables: { name → role } }`. Stocké dans `DatabaseRegistry`, injecté dans les prompts SQL et explicatifs.
- **Pipeline assistant** : 2 appels LLM max par question — Qwen génère le SQL (JSON strict), Llama formule la phrase à partir du résultat (avec branches dédiées pour le scalaire, le vide, la description, le résumé, et la clarification).
- **Sécurité de l'assistant** : 3 verrous indépendants — DB en read-only, `SqlGuard` (regex anti-écriture), `SqlValidator` (`SELECT|WITH` only, anti-multi-statement, blacklist explicite, validation des tables référencées contre la whitelist d'introspection).
- **Code modulaire** : la logique métier vit en classes typées dans `/lib` (`Database`, `Introspector`, `Humanizer`, `LabelRefiner`, `SchemaContextBuilder`, `LlmClient`, `MockLlmClient`, `Assistant`, `PromptBuilder`, `CsvExporter`, `PdfExporter`…). Les composants React restent fonctionnels — chacun son idiome.

---

## Choix UX

- **Single-page strict** : sidebar tables · main données · assistant à droite. Aucune sous-page.
- **Inspiration** : structure Shopify admin + clarté Google Sheets.
- **Badge « Mode lecture seule »** permanent dans la topbar, avec rappel discret sous le titre de table.
- **Zéro jargon** côté utilisateur (`schema`, `query`, `NULL`, `VARCHAR` n'apparaissent jamais — pictos discrets pour le type à la place).
- **Onboarding en 3 étapes** affiché tant qu'aucune table n'est sélectionnée : « À gauche, vos tables · Au-dessus, recherche et exports · À droite, l'assistant ». La table n'est plus auto-sélectionnée après upload pour laisser l'utilisateur prendre ses repères.
- **États vides chaleureux** : *« Importez une base SQLite pour commencer. »*, *« Aucun résultat pour cette recherche. »*, *« Aucune table exploitable trouvée dans cette base. »*
- **Placeholders intelligents** dans la barre de recherche (« Rechercher dans Commandes… ») et l'assistant.
- **3 personas en tête** : Martine (54 ans, peur de casser), Youssef (38 ans, veut des réponses rapides), Claire (62 ans, exporte pour un courrier).

---


## Avec plus de temps

### Technique
- **Validation SQL plus fine** par parsing AST plutôt que regex.
- **Sessions sauvegardées** : sessions sauvegardées + historique.
- **Améliorer les LLM** : amélioration et correction des bugs sur les LLM, et amélioration des réponses, plus humaines et plus dynamiques. Apporter aussi plus de dynamisme sur l'analyse des autres tables et de la base de données globale.
- **Options LLM** : ajouter une option pour remplacer facilement les LLM locaux par des LLM via clé API (pas encore testé). Étudier la possibilité d'utiliser Ollama avec deux LLM en même temps en streaming.
- **Améliorer la labellisation** : tester et corriger plus de cas de figure pour des bases de données avec des noms plus complexes.
- **Tester et prouver un déploiement en PROD** : pour l'instant testé en dev, la prod n'est pas encore réalisée (cloud, coût, etc.).

### UX
- **Mise en place d'un système d'écriture micro** : écrire à l'assistant via microphone à la place du clavier.
- **Mode mobile et responsive** (drawer pour sidebar et assistant).
- **Sensation plus rapide et fluide** : mode streaming des réponses Llama pour réduire la latence perçue.
- **Statistiques par colonne** (min/max, distribution, valeurs distinctes) au clic sur l'en-tête.
- **Mode guidé amélioré** : mettre en place un système de guide étape par étape sur le site.
- **Ajouter plus de clarté sur la sidebar gauche** : expliquer de manière plus arborescente que le fichier contient différentes tables.
- **Améliorer le changement de base de données** : chargement du fichier et reprise de zéro du site.


---



## Structure du projet

```
app/
  page.tsx                   # vue unique, deux états (avant / après upload)
  layout.tsx
  globals.css
  api/
    database/upload/         # POST  : reçoit le fichier, introspecte, renvoie le schéma
    database/schema/         # GET   : renvoie le schéma complet
    database/table/          # GET   : lignes paginées + recherche
    database/labels/         # POST  : raffine les libellés via Qwen (batch)
    database/context/        # POST construit / PUT restaure / GET lit le contexte global
    assistant/query/         # POST  : pipeline NL → SQL → exécution → réponse
components/
  TopBar.tsx · Sidebar.tsx · SearchBar.tsx · TableView.tsx · TableSummary.tsx
  AssistantChat.tsx · Footer.tsx · UploadDropzone.tsx · Onboarding.tsx
  ResizeHandle.tsx · Toast.tsx
lib/
  Database.ts                # wrapper better-sqlite3 (readonly)
  Introspector.ts            # sqlite_master + PRAGMA
  Humanizer.ts               # libellés FR (heuristiques + dictionnaire)
  LabelRefiner.ts            # raffinement Qwen + sanitisation
  SchemaContextBuilder.ts    # contexte global (domaine + rôle de chaque table)
  SqlGuard.ts                # quoting + whitelist + readOnly assert
  SqlValidator.ts            # garde anti-écriture côté assistant
  LlmClient.ts               # client Ollama (fetch direct)
  MockLlmClient.ts           # heuristiques FR pour le fallback
  PromptBuilder.ts           # prompts SQL et explicatifs (describe / summary / clarify)
  Assistant.ts               # orchestrateur (schema → SQL → exec → format)
  Suggester.ts               # 3 suggestions contextuelles par table
  CsvExporter.ts             # export CSV (UTF-8 + BOM + ;)
  PdfExporter.ts             # export PDF (jsPDF + autoTable)
  DatabaseRegistry.ts        # registre in-memory des DB + contexte global
  api.ts                     # client HTTP côté navigateur
  useResizableWidth.ts       # hook de redimensionnement persistant
  errors.ts                  # erreurs typées
  types.ts                   # Schema, RowsPayload, AssistantResponse, SchemaContext, …
scripts/
  create-demo-databases.ts   # génère les 2 bases de démo
demo-databases/              # bases SQLite générées
.claude/                     # règles, agents et skills (méta-doc projet)
Makefile                     # make dev / make build / make start / make clean
```

---


## Licence

POC livré dans le cadre d'un test technique.
