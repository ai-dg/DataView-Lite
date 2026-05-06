---
name: table-summary
description: Génère un résumé automatique en français d'une table SQLite (volume, plages de dates, valeurs dominantes). Bonus listé dans le PDF du sujet (« Cette table contient 1 203 clients, principalement en Île-de-France, créés entre 2019 et 2024 »). À utiliser pour ajouter une phrase d'accueil sous le titre de la table.
---

# Skill : table-summary

## Pourquoi ce skill existe
Le PDF du sujet liste explicitement, dans les bonus :
> *« Résumé automatique d'une table ("Cette table contient 1 203 clients, principalement en Île-de-France, créés entre 2019 et 2024"). »*

C'est un détail qui crée le **« wow effet »** lors de la démo et qui aide Martine à comprendre ce qu'elle regarde sans avoir à scroller.

## Comportement UX
- Affiché **sous le titre de la table**, dans la zone centrale.
- **Une seule phrase**, italique, gris foncé (taille 14 px).
- Disparaît dès qu'une recherche est tapée (le résumé porte sur la table entière, pas sur le filtre).
- Apparition douce (fade 200 ms) au changement de table.
- Si le résumé n'est pas calculable → ne rien afficher (jamais de message d'erreur ici).

## Stratégie de génération (2 couches, prudente)

### Couche 1 — heuristiques locales (toujours dispo, < 50 ms)
À partir des **statistiques calculées en SQL** sur la table :
1. **Compter les lignes** : `SELECT COUNT(*) FROM <t>`.
2. **Plage de dates** sur la 1ʳᵉ colonne typée date : `SELECT MIN(c), MAX(c) FROM <t>`.
3. **Valeur dominante** sur la 1ʳᵉ colonne texte courte (ville, statut, catégorie) :
   `SELECT c, COUNT(*) FROM <t> GROUP BY c ORDER BY 2 DESC LIMIT 1`.
4. Composer la phrase via un template :
   > *« Cette table contient **{N}** {label-table-pluriel}, principalement à **{ville}**, entre **{minDate}** et **{maxDate}**. »*

Variantes selon ce qui est disponible :
- Pas de date → omettre la fin.
- Pas de colonne dominante → *« Cette table contient {N} {label}. »*

### Couche 2 — raffinement LLM (optionnel, llama3.2:3b)
- **Modèle** : `llama3.2:3b` (rôle exclusif : explication / phrase de réponse).
- **Jamais** `qwen2.5-coder` ici (ce n'est pas du SQL).
- Envoi : la phrase heuristique + 3–5 exemples de lignes (max 20). Demander une **reformulation chaleureuse en une phrase**.
- Cache : `localStorage` par hash `(table-name + count + minDate + maxDate)`.
- Timeout 5 s. Si échec → on garde la phrase heuristique.

## Architecture

```ts
// lib/TableSummarizer.ts
export class TableSummarizer {
  constructor(
    private readonly db: Database,
    private readonly humanizer: Humanizer,
    private readonly llm?: LlmClient,            // optionnel
  ) {}

  async summarize(tableName: string): Promise<string | null> {
    const stats = await this.#stats(tableName);
    const heuristic = this.#compose(tableName, stats);
    if (!heuristic) return null;
    if (!this.llm) return heuristic;
    return this.#refine(heuristic, stats).catch(() => heuristic);
  }

  async #stats(t: string): Promise<TableStats> { /* COUNT, MIN/MAX date, top text */ }
  #compose(t: string, s: TableStats): string | null { /* template FR */ }
  async #refine(phrase: string, s: TableStats): Promise<string> { /* llama3.2 */ }
}
```

## Exemples cibles
| Table | Phrase générée |
|---|---|
| `tbl_clients` (132 lignes, ville dominante Lyon, entre 2020 et 2024) | *« Cette table contient **132 clients**, principalement à **Lyon**, ajoutés entre **2020** et **2024**. »* |
| `cotis` (47 lignes, année 2023–2025) | *« Cette table contient **47 cotisations**, enregistrées entre **2023** et **2025**. »* |
| `prod` (84 lignes, sans date) | *« Cette table contient **84 produits**. »* |

## Sécurité
- Le LLM ne reçoit **jamais** le contenu brut de la table. Seulement la phrase heuristique + max 5 lignes échantillonnées.
- Aucune écriture en base.

## Anti-règles
- ❌ Pas de graphique, pas d'histogramme → hors POC.
- ❌ Pas de plus d'une phrase.
- ❌ Pas de pourcentages exacts (« 73,4 % de Lyon ») — *« principalement »* suffit, plus chaleureux.
- ❌ Pas d'appel LLM bloquant pour l'affichage : la phrase heuristique s'affiche tout de suite, le raffinement remplace en silence.
- ❌ Pas de mention du nom technique de la table.

## Référence
- `rules/llm.md` — `llama3.2:3b` pour explications uniquement.
- `rules/ux.md` — wording chaleureux, pas de jargon.
- `rules/ui-layout.md` — position sous le titre de la table.
- `agents/empty-state-writer.md` — voix à respecter.
