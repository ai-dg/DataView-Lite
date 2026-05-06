---
name: onboarding-placeholders
description: Génère des placeholders contextuels pour la barre de recherche et l'assistant IA, adaptés à la table active. À utiliser pour implémenter le mode guidé sans tour produit lourd. Issu du brainstorming.
---

# Skill : onboarding-placeholders

## Pourquoi ce skill existe
Issu du brainstorming : *« Mode guidé / onboarding pour la première visite : placeholder dans search. »*
Pas de tutoriel intrusif. Pas de tour produit. **Le placeholder est l'onboarding** : il enseigne par l'exemple, sans interrompre.

## Principe
Le placeholder doit :
1. Être **utile même quand on ne le lit pas** (suggère l'action évidente).
2. **S'adapter à la table active** (si on est sur Clients, l'exemple parle de clients).
3. Donner un **exemple concret en français**, pas une règle abstraite.
4. Disparaître dès qu'on tape (placeholder HTML standard).

## Catalogue par contexte

### Avant qu'une base soit chargée (zone centrale)
- *« Glissez votre fichier .sqlite ici, ou cliquez pour le choisir »*

### Base chargée, aucune table sélectionnée
- Sidebar mise en valeur visuellement.
- Message centré : *« Choisissez une table à gauche pour commencer. »*

### Barre de recherche, table active
Inférer le sujet à partir du nom humanisé de la table :

| Type détecté | Placeholder suggéré |
|---|---|
| Table « personnes » (clients, membres, adhérents, employés…) | *« Tapez un nom, une ville… (ex. "Lyon") »* |
| Table « commandes / factures » | *« Tapez un numéro, un nom… (ex. "FAC-2024") »* |
| Table « produits / stock » | *« Tapez une référence ou un mot… (ex. "stylo") »* |
| Table « événements / dates » | *« Tapez un lieu, une année… (ex. "Paris") »* |
| Fallback générique | *« Tapez un mot pour filtrer cette table »* |

### Assistant IA, table active
| Type détecté | Placeholder suggéré |
|---|---|
| personnes | *« Posez une question : "Combien de clients à Lyon ?" »* |
| commandes | *« Posez une question : "Combien de commandes en mars ?" »* |
| produits | *« Posez une question : "Quels produits sont en rupture ?" »* |
| événements | *« Posez une question : "Quels événements en 2024 ?" »* |
| Fallback | *« Posez une question en français… »* |

### Première visite (1ʳᵉ base chargée jamais)
Bandeau d'accueil non bloquant en haut de la zone centrale, pendant 8 secondes :
> *« Bonjour 👋 Cliquez sur une table à gauche pour voir les données. »*

`localStorage.setItem('dvl.firstVisitDone', '1')` après dismiss ou clic sur une table.

## Détection du « type de table »
Heuristique sur le nom **humanisé** (jamais sur le brut) :

```ts
// lib/PlaceholderHints.ts
export class PlaceholderHints {
  constructor(private readonly humanizer: Humanizer) {}

  forSearch(tableName: string): string {
    const kind = this.#detect(tableName);
    return SEARCH_HINTS[kind] ?? SEARCH_HINTS.fallback;
  }

  forAssistant(tableName: string): string {
    const kind = this.#detect(tableName);
    return ASSISTANT_HINTS[kind] ?? ASSISTANT_HINTS.fallback;
  }

  #detect(tableName: string): TableKind {
    const label = this.humanizer.humanizeTable(tableName).toLowerCase();
    if (/(client|membre|adh[ée]rent|employ[ée]|personne|user|utilisateur)/.test(label)) return 'people';
    if (/(commande|facture|achat|order|invoice)/.test(label)) return 'orders';
    if (/(produit|stock|article|product|item)/.test(label)) return 'products';
    if (/([ée]v[ée]nement|s[ée]ance|event|date)/.test(label)) return 'events';
    return 'fallback';
  }
}
```

## Anti-règles
- ❌ Pas de **modale d'onboarding** au premier chargement.
- ❌ Pas de **tour interactif** (Intro.js, Driver.js…).
- ❌ Pas de **toast permanent** qui pollue l'écran.
- ❌ Pas de placeholder qui ressemble à du **vrai contenu** (gris clair obligatoire).

## Bonus (si temps)
- 3 **suggestions cliquables** sous la barre de l'assistant, générées à partir du schéma de la table active. Au clic → pré-remplit l'input.

## Référence
- `rules/ux.md` — onboarding via placeholders.
- `rules/ui-layout.md` — placement de la searchbar et de l'assistant.
- `agents/humanizer.md` — fournit le nom humanisé utilisé pour la détection.
