# demo.md

## Script de démo (3 minutes)

### 1. Pitch d'ouverture (15 s)
> « phpMyAdmin existe depuis 25 ans et reste illisible pour quelqu'un comme ma mère.
> DataView Lite, c'est l'idée : la même puissance, pour Martine, Youssef et Claire. »

### 2. Démo base #1 — PME (60 s)
1. **Upload** `pme.sqlite` (drag & drop).
2. Pointer la sidebar : *« Les tables apparaissent avec des noms compréhensibles : Clients, Commandes, Produits — pas `tbl_ord_2019`. »*
3. Cliquer **Commandes** → table affichée, colonnes en français.
4. Pointer le badge **🔒 Mode lecture seule** : *« Martine n'a pas peur de casser quoi que ce soit. »*
5. **Recherche** : taper `Lyon` → résultats filtrés.
6. **Assistant** : *« Combien de commandes en mars ? »* → gros chiffre.

### 3. Démo base #2 — Association (45 s)
1. **Changer de base** → upload `assoc.sqlite`.
2. Sidebar régénérée : Adhérents, Cotisations, Événements.
3. *« Aucune ligne de code n'a changé. L'app a relu le schéma et tout adapté. »*
4. **Assistant** : *« Qui n'a pas payé sa cotisation ? »* → tableau lisible.

### 4. Bonus à montrer si présents (30 s)
- Résumé de table.
- Export CSV.
- Suggestions de questions contextuelles.

### 5. Clôture (15 s)
> « Deux bases de domaines totalement différents, zéro hardcoding, et trois personas qui peuvent l'utiliser sans formation. »

## Points clés à marteler
- **Généricité** — *« changeons la base, regardez. »*
- **UX pour non-techniques** — wording, badge lecture seule, états vides.
- **Single-page assumé** — pas de navigation, tout sous les yeux.
- **IA au service de l'UX**, pas l'inverse — le SQL est caché.

## Trade-offs assumés (à dire sans s'excuser)
- **sql.js en navigateur** : pas scalable, mais parfait pour un POC zéro backend.
- **Heuristiques + LLM pour humaniser** : compromis vitesse / qualité.
- **Pagination naïve** : suffit pour la démo, pas pour 1M de lignes.
- **Mock LLM possible** si clé API absente : la couche d'introspection reste réelle.
- **Pas de tests** : volontairement, le sujet l'exclut.

## Si quelque chose est incomplet
Ne pas s'excuser. Dire :
> « J'ai priorisé X parce que c'est le cœur du sujet (généricité / UX). Avec plus de temps, j'aurais ajouté Y et Z. »

## « Avec plus de temps » (pour le README et l'oral)
- Vrai onboarding première visite.
- Détection de relations (clés étrangères) → liens cliquables entre tables.
- Résumés statistiques par colonne (min/max/distribution).
- Cache LLM des libellés humanisés en localStorage par hash de schéma.
- Support MySQL/Postgres via une couche d'adaptateurs.
- Mode mobile.

## Questions probables et réponses préparées
- *« Pourquoi sql.js et pas un backend ? »* → vitesse de dev + lecture seule garantie + démo offline.
- *« Comment tu humanises sans hardcoder ? »* → heuristiques + dictionnaire FR + 1 appel LLM batch optionnel.
- *« Et si la base fait 10 Go ? »* → pas le cas d'usage POC ; pour la prod, backend + pagination serveur.
- *« Pourquoi pas de tests ? »* → 2h chrono, le sujet exclut explicitement les tests.
- *« Et la sécurité du SQL généré par l'IA ? »* → regex anti-écriture côté serveur + sql.js en sandbox navigateur.
