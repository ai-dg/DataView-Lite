# ui-layout.md

## Inspiration explicite (issue du brainstorming)
**Mix Shopify admin + Google Sheets.**
- **Shopify** → structure : sidebar gauche, topbar fine, zone centrale dominante.
- **Google Sheets** → clarté de la donnée : grille dense, en-têtes figés, lignes lisibles.

L'utilisateur doit reconnaître l'archétype en 2 secondes : *« ah, c'est comme Shopify / comme Sheets, je sais où regarder. »*

## Deux états de l'écran

L'app a **deux états mutuellement exclusifs** dans la même page :

### État A — aucune base chargée (Desktop 2 du brainstorming)
La zone centrale **prend tout l'écran** (sidebar et assistant cachés ou très discrets) :

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOPBAR — 📊 DataView Lite                          🔒 Mode lecture seule │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                                                                          │
│                    ╔════════════════════════════════╗                    │
│                    ║     📁  First Upload .db       ║                    │
│                    ║                                ║                    │
│                    ║  Glissez votre fichier .sqlite ║                    │
│                    ║  ici, ou cliquez pour le       ║                    │
│                    ║  choisir.                      ║                    │
│                    ║                                ║                    │
│                    ║  Vos données restent sur       ║                    │
│                    ║  votre ordinateur.             ║                    │
│                    ╚════════════════════════════════╝                    │
│                                                                          │
│              Mode guidé / onboarding pour la première visite             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### État B — base chargée (Desktop 1 du brainstorming)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (h: 56)                                       [⬇ CSV] [📄 PDF]    │
│ 📊 DataView Lite   [📁 Upload/Changer .db]   🔒 Mode lecture seule       │
├──────────────┬──────────────────────────────────────────┬────────────────┤
│  SIDEBAR     │  TITRE de la table active (h: 40)        │                │
│  (w: 240)    │  Commandes                               │  ASSISTANT IA  │
│              ├──────────────────────────────────────────┤  (w: 320)      │
│  Tables      │  SEARCHBAR (h: 48, sticky)               │                │
│  • Clients   │  🔎 Rechercher dans Commandes…           │  Posez une     │
│  • Commandes ├──────────────────────────────────────────┤  question      │
│  • Factures  │  TABLE Excel-like (scroll vertical)      │  en français   │
│  • Produits  │  ┌────────────────────────────────────┐  │                │
│              │  │ En-tête figé (sticky)              │  │  Exemples :    │
│              │  ├────────────────────────────────────┤  │  • Combien…    │
│              │  │ ligne 1                            │  │  • Qui à Lyon? │
│              │  │ ligne 2 (zebra)                    │  │  • …           │
│              │  └────────────────────────────────────┘  │                │
│              │                                          │  [_________]   │
│              │                                          │  [Demander]    │
├──────────────┴──────────────────────────────────────────┴────────────────┤
│ FOOTER (h: 40) — ◀ Page 1 / 4 ▶            🔒 Lecture seule  ·  v0.1     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Différence clé avec le brouillon précédent (issu du brainstorming Desktop 1)** :
- Les **boutons d'export sont en haut à droite de la topbar**, pas dans le footer.
- Le **titre de la table active** s'affiche au-dessus de la searchbar dans la zone centrale.
- Le **footer global** porte la pagination + un rappel discret du mode lecture seule + version.
- L'**assistant** affiche **3 exemples de questions** cliquables (cf. `skills/onboarding-placeholders.md`).

### Largeurs cibles
| Zone | Desktop large (≥1280) | Desktop standard (1024–1279) | Tablette (≥768) |
|---|---|---|---|
| Sidebar | 240 px | 220 px | repliable (drawer) |
| Assistant | 320 px | 280 px | repliable (drawer) |
| Centre | reste | reste | pleine largeur |

Mobile (<768) : hors périmètre POC. Mention dans le README « avec plus de temps ».

### Hauteurs
- Topbar : 56 px, fond clair, séparateur 1 px en bas. Contient les **boutons d'export à droite** (`⬇ CSV`, `📄 PDF`) et le badge `🔒 Mode lecture seule`.
- Titre de table : 40 px, dans la zone centrale, juste au-dessus de la searchbar.
- Searchbar : 48 px, sticky en haut de la zone centrale.
- Footer global : 40 px, plein écran, contient pagination + rappel `🔒 Lecture seule` + version. Sticky bas.

### Position des exports (corrigée d'après le brainstorming)
Les boutons **⬇ CSV** et **📄 PDF** sont **en haut à droite de la topbar**, pas dans le footer.
- Désactivés (gris) tant qu'aucune table n'est sélectionnée.
- Tooltip si désactivés : *« Choisissez une table pour exporter. »*
- Voir `skills/export-csv.md` et `skills/export-pdf.md` pour les comportements.

## Composants — règles « Shopify »
- Sidebar : fond très légèrement teinté, items 40 px de haut, icône optionnelle à gauche.
- Item actif : fond accent doux + barre verticale 3 px à gauche.
- Topbar : sobre, call-to-action principal (« Upload / Changer .db ») + zone exports à droite + badge lecture seule.
- **Titre de la table active** : `h1` taille 20–24 px, semi-bold, sous la topbar, dans la zone centrale.
- Badge **🔒 Mode lecture seule** : pill arrondie, jamais cachée, tooltip au hover.

## Composants — règles « Sheets »
- Table : `border-collapse`, lignes 36 px, padding cellule 8/12 px.
- En-têtes : `sticky top: 0`, fond gris clair, semi-bold, **libellés humanisés**.
- Lignes alternées (`zebra`) pour l'effet tableur.
- Largeur de colonne auto, **min 80 px**, max 320 px, ellipsis au-delà avec tooltip.
- Tri au clic sur l'en-tête (flèche ▲▼ discrète).
- Sélection de ligne au clic : surbrillance (pas d'action destructive — lecture seule).
- **Type de donnée affiché en picto discret** dans l'en-tête (📝 texte, # nombre, 📅 date, ✓ booléen). Jamais le type SQL.

## Densité et lisibilité (issu du brainstorming)
- **Texte minimum 14 px** (16 px pour le contenu principal).
- **Boutons ≥ 36 px de haut**, libellés explicites (« Changer de base », pas « Reload »).
- **Pas de petit texte complexe** : Claire (62 ans) doit lire sans effort.
- Contraste AA minimum partout. Hover toujours visible (pas que le curseur).

## Couleurs (palette Tailwind, sobre)
- Fond app : `bg-white` / sidebar `bg-slate-50`.
- Accent primaire : `bg-emerald-600` (boutons d'action — rappel Shopify).
- Bordures : `border-slate-200`.
- Hover ligne : `hover:bg-slate-50`.
- Badge lecture seule : `bg-amber-100 text-amber-900` (chaud, rassurant, pas alarmant).
- Erreurs douces : `bg-rose-50 text-rose-900` — jamais rouge vif.

## Interactions « cliquer avant taper » (issu du brainstorming)
La donnée est **toujours atteignable au clic** :
1. Cliquer une table dans la sidebar → données affichées.
2. Cliquer un en-tête → tri.
3. Cliquer pagination → page suivante.
4. La barre de recherche est **un bonus**, pas un passage obligé.

## États affichés (rappel `ux.md`)
Chaque zone a son état vide câblé :
- **État A (avant upload)** : zone centrale en plein écran, grande zone de drop, message rassurant. Sidebar et assistant masqués (ou très atténués).
- **État B, base chargée mais pas de table** : *« Choisissez une table à gauche pour commencer. »* — sidebar mise en avant.
- **Centre, recherche sans résultat** : *« Aucune donnée trouvée. »*
- **Assistant, au repos** : placeholder contextuel + 3 exemples de questions cliquables.

## Assistant — détail
Bloc latéral droit, avec 3 zones empilées :
1. Titre court : *« Assistant »*.
2. Zone de réponse (vide initialement).
3. **3 exemples de questions** sous l'input, cliquables, qui pré-remplissent (cf. `skills/onboarding-placeholders.md`).
4. Input + bouton **Demander**.

## Anti-règles (interdits dans la grille)
- ❌ Dropdown menus à plusieurs niveaux.
- ❌ Tabs internes dans la zone centrale.
- ❌ Modales (sauf confirmation d'export, et encore — préférer toast).
- ❌ Drawer qui pousse le contenu (toujours overlay).
- ❌ Animations longues > 200 ms.

## Référence
- `rules/ux.md` — wording, états, principes.
- `rules/code-style.md` — composants React fonctionnels, logique métier dans `/lib`.
- `agents/ux-reviewer.md` — relit chaque écran à l'aune de ces règles.
