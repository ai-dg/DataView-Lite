# ux.md

## Écran unique (obligatoire)

```
┌────────────────────────────────────────────────────────────────┐
│  📊 DataView Lite        [📁 Changer de base]  🔒 Lecture seule │
├──────────────┬───────────────────────────────────┬─────────────┤
│              │  🔎 Rechercher dans Commandes…    │             │
│  Tables      ├───────────────────────────────────┤  Assistant  │
│              │                                   │             │
│  • Clients   │   N°   Client    Date    Total    │  Posez une  │
│  • Commandes │   001  Dupont   12/03    142 €    │  question   │
│  • Produits  │   002  Martin   13/03     89 €    │  en français│
│  • Factures  │   …                               │             │
│              │                                   │  [______]   │
│              │   ◀  Page 1 / 4  ▶                │  [Demander] │
└──────────────┴───────────────────────────────────┴─────────────┘
```

## Principes UX (pour Martine, Youssef, Claire — issus du brainstorming)
- **Compréhensible en 5 secondes.** Au premier coup d'œil : « ah, c'est mes données ».
- **Zéro jargon.** Aucun mot technique visible.
- **Familiarité Shopify / Google Sheets.** Deux menus latéraux + zone centrale de données : Youssef et Claire reconnaissent ce schéma.
- **Éviter de devoir écrire trop.** Boutons et tables déjà accessibles : on **clique** avant de taper. La barre de recherche est un bonus, pas un passage obligé.
- **Texte lisible, grand, boutons visibles.** Pas de petits textes complexes. Claire (62 ans) tape lentement et n'utilise pas de raccourcis clavier.
- **Single-page assumé.** Pas de sous-pages : ça prête à confusion pour des non-techniciens.
- **Navigation évidente.** Une seule action principale par zone.
- **Feedback rassurant.** Badge « 🔒 Mode lecture seule » permanent. Tooltip : *« Vos données ne peuvent pas être modifiées. »* — répond à la peur de Martine de « casser quelque chose ».
- **Pas de modales bloquantes.** Tout reste visible.
- **Exporter = courrier prêt à coller.** Claire exporte pour rédiger un courrier ; le bouton export doit être évident, le CSV directement utilisable.

## Wording (français, chaleureux, non technique)
| Évite | Préfère |
|---|---|
| Database | Base de données |
| Schema | Structure |
| Query | Recherche / Question |
| Row | Ligne |
| Column | Colonne |
| Table `tbl_ord_2019` | « Commandes » |
| `NULL` | *(vide)* |
| `SELECT * FROM…` | (jamais affiché) |
| Error 500 | « Désolé, je n'ai pas compris. Voici les tables disponibles : … » |
| Empty result | « Aucun résultat. Essayez un autre mot. » |

## Humanisation des libellés
- `tbl_orders` → **Commandes**
- `usr_id` → **Identifiant utilisateur** (ou masqué si clé technique)
- `created_at` → **Date de création**
- `qty` → **Quantité**
- `addr_city` → **Ville**

Stratégie en 2 couches :
1. **Heuristiques locales** (instant) : préfixes, abréviations, dictionnaire FR.
2. **Raffinement LLM** (1 appel batch au chargement) : envoie la liste, reçoit des libellés meilleurs. Caché en `localStorage` par hash de schéma.

## États à soigner (wording exact, issu du brainstorming)
- **Avant upload (empty state)** : grande zone d'accueil. *« Glissez votre fichier .sqlite ici, ou cliquez pour le choisir. »* Mention rassurante : *« Vos données restent sur votre ordinateur. »*
- **Chargement** : *« Chargement de la base… »* (spinner doux, pas de pourcentage faux).
- **Base chargée, aucune table sélectionnée** : *« Choisissez une table à gauche pour commencer. »*
- **Table vide / recherche sans résultat** : *« Aucune donnée trouvée. »* (variante contextuelle : *« Aucun résultat pour "Lyon" dans Clients. Essayez un autre mot. »*)
- **Erreur d'upload / fichier illisible** : *« Impossible de lire le fichier. »* (sous-texte : *« Vérifiez qu'il s'agit bien d'une base SQLite (.sqlite ou .db). »*)
- **Question floue à l'assistant** : *« Je ne suis pas sûr de comprendre. Voici les tables disponibles : … »*

## Onboarding première visite (mode guidé léger)
Pas de tour produit lourd. **Onboarding = placeholders intelligents** (issu du brainstorming) :
- Placeholder de la barre de recherche : *« Tapez un nom, un mot… (ex. "Lyon") »*
- Placeholder de l'assistant : *« Posez une question : "Combien de clients ?" »* (suggestion adaptée à la table active).
- Message d'accueil quand une base est chargée pour la 1re fois : *« Bonjour 👋 Cliquez sur une table à gauche pour voir les données. »*

## Micro-attentions
- Petit emoji discret par type de table détecté (👥 personnes, 🛒 commandes, 📦 produits) — heuristique sur le nom.
- Animation douce quand la base se charge.
- Message d'accueil personnalisé : *« Bonjour 👋 Quelle base voulez-vous explorer aujourd'hui ? »*
- Bouton « Exporter en CSV » discret en bas du tableau (bonus).

## Règles d'or
- Pas de SQL visible. Jamais.
- Pas de termes techniques. Jamais.
- Tout libellé est en français naturel.
- L'utilisateur ne doit **jamais** se sentir bête.
