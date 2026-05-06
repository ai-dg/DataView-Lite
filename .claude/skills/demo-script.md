---
name: demo-script
description: Déroule le pitch de présentation de DataView Lite en 3 minutes, sur les deux bases de démo. À utiliser pour préparer la soutenance ou enregistrer une vidéo.
---

# Skill : demo-script

## Objectif
Tenir une démo **convaincante en 3 minutes**, qui prouve la généricité, l'UX et l'IA locale.

## Préparation (avant de lancer la démo)
- [ ] Les 2 bases sont dans `public/samples/` (`pme.sqlite`, `assoc.sqlite`).
- [ ] L'app tourne (`npm run dev`).
- [ ] Ollama tourne **OU** `MOCK_LLM=true` est activé (la démo doit marcher dans les deux cas).
- [ ] Fenêtre du navigateur en grand, zoom 110 % minimum (lisibilité).
- [ ] Onglets superflus fermés.

## Script (3 minutes)

### 0:00 — 0:15 — Pitch d'ouverture
> *« phpMyAdmin existe depuis 25 ans et reste illisible pour quelqu'un comme ma mère. DataView Lite, c'est l'idée : la même puissance, pour Martine, Youssef et Claire. Et tout tourne en local — vos données ne sortent jamais de votre machine. »*

### 0:15 — 1:15 — Base #1 : PME (univers Youssef)
1. **Upload** `pme.sqlite` (drag & drop).
2. Pointer la sidebar : *« Les tables apparaissent en français : Clients, Commandes, Produits — pas `tbl_ord_2024`. »*
3. Cliquer **Commandes** → table affichée, colonnes humanisées.
4. Pointer le badge **🔒 Mode lecture seule** : *« Martine n'a pas peur de casser quoi que ce soit. »*
5. **Recherche** : taper `Lyon` → résultats filtrés.
6. **Assistant** : *« Combien de commandes en mars ? »* → gros chiffre + phrase chaleureuse.

### 1:15 — 2:15 — Base #2 : Association (univers Claire)
1. **Changer de base** → upload `assoc.sqlite`.
2. Sidebar régénérée : Membres, Cotisations, Événements.
3. *« Aucune ligne de code n'a changé. L'app a relu le schéma et tout adapté. »*
4. **Assistant** : *« Qui n'a pas payé sa cotisation ? »* → tableau lisible.
5. **Exporter en CSV** : *« Claire récupère la liste pour son courrier. »*

### 2:15 — 2:45 — Architecture en 30 secondes
- *« Single-page React/Next.js. SQLite tourne en navigateur via sql.js — zéro backend pour la base. »*
- *« Deux modèles Ollama locaux : `qwen2.5-coder` génère le SQL caché, `llama3.2` formule la réponse en français. »*
- *« Si Ollama est absent, mock mode : la démo tient quand même. »*

### 2:45 — 3:00 — Clôture
> *« Deux bases de domaines différents, zéro hardcoding, zéro fuite réseau, et trois personas qui peuvent l'utiliser sans formation. »*

## Si quelque chose plante
- **L'IA met du temps** → *« Le modèle local pèse 4.7 Go ; en prod on cacherait les questions fréquentes. »*
- **Mock mode actif** → l'assumer : *« On voit ici le mode dégradé qui garantit que l'app ne casse jamais. »*
- **Bug visible** → ne pas s'excuser, dire ce qu'on aurait fait avec plus de temps.

## Référence
- `rules/demo.md` — version longue + Q&R préparées.
- `skills/seed-sample-db.md` — pour régénérer les 2 bases si besoin.
