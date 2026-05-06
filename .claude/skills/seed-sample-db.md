---
name: seed-sample-db
description: Crée et peuple deux bases SQLite de démo (PME e-commerce et Association) pour prouver la généricité de DataView Lite. À utiliser pour générer public/samples/pme.sqlite et public/samples/assoc.sqlite.
---

# Skill : seed-sample-db

## Objectif
Produire **2 fichiers SQLite** de domaines métier distincts, avec **noms intentionnellement variés** (préfixes `tbl_`, abréviations, snake_case) pour démontrer que DataView Lite humanise tout dynamiquement.

## Volumes
- 10 à 20 lignes par table (le PDF s'en contente).
- Données **réalistes en français** (Lyon, Dupont, cotisations…), pas de Lorem.

## Bases à créer

### `public/samples/pme.sqlite` — PME e-commerce (univers Youssef)
- `tbl_clients` : `id`, `nom`, `prenom`, `email`, `addr_ville`, `created_at`
- `tbl_ord_2024` : `id`, `client_id`, `date_cmd`, `total_eur`, `statut`
- `prod` : `id`, `ref`, `libelle`, `prix_eur`, `qty_stock`
- `tbl_inv` : `id`, `ord_id`, `date_inv`, `montant_eur`, `paye`

### `public/samples/assoc.sqlite` — Association (univers Claire)
- `membres` : `id`, `nom`, `prenom`, `dob`, `addr_ville`, `tel`
- `cotis` : `id`, `membre_id`, `annee`, `montant_eur`, `paye_le`
- `evt` : `id`, `nom_evt`, `date_evt`, `lieu`, `nb_participants`

> Les préfixes/abrévations sont **volontaires** : ils prouvent que l'humanisation marche.

## Génération (Node.js + better-sqlite3, à exécuter une fois)

```js
// scripts/seed.js
const Database = require('better-sqlite3');
const fs = require('fs');

function seedPme() {
  fs.rmSync('public/samples/pme.sqlite', { force: true });
  const db = new Database('public/samples/pme.sqlite');
  db.exec(`
    CREATE TABLE tbl_clients (id INTEGER PRIMARY KEY, nom TEXT, prenom TEXT, email TEXT, addr_ville TEXT, created_at TEXT);
    CREATE TABLE tbl_ord_2024 (id INTEGER PRIMARY KEY, client_id INTEGER, date_cmd TEXT, total_eur REAL, statut TEXT);
    CREATE TABLE prod (id INTEGER PRIMARY KEY, ref TEXT, libelle TEXT, prix_eur REAL, qty_stock INTEGER);
    CREATE TABLE tbl_inv (id INTEGER PRIMARY KEY, ord_id INTEGER, date_inv TEXT, montant_eur REAL, paye INTEGER);
  `);
  // ... INSERT 10–20 lignes par table (Dupont/Lyon, Martin/Paris, etc.)
  db.close();
}

function seedAssoc() {
  fs.rmSync('public/samples/assoc.sqlite', { force: true });
  const db = new Database('public/samples/assoc.sqlite');
  db.exec(`
    CREATE TABLE membres (id INTEGER PRIMARY KEY, nom TEXT, prenom TEXT, dob TEXT, addr_ville TEXT, tel TEXT);
    CREATE TABLE cotis (id INTEGER PRIMARY KEY, membre_id INTEGER, annee INTEGER, montant_eur REAL, paye_le TEXT);
    CREATE TABLE evt (id INTEGER PRIMARY KEY, nom_evt TEXT, date_evt TEXT, lieu TEXT, nb_participants INTEGER);
  `);
  // ... INSERT 10–20 lignes par table
  db.close();
}

seedPme();
seedAssoc();
console.log('✅ 2 bases de démo générées.');
```

Lancer :
```bash
node scripts/seed.js
```

## Vérifications post-génération
- [ ] Les fichiers existent dans `public/samples/`.
- [ ] Charger chacun dans l'app prouve la généricité (sidebar et libellés différents).
- [ ] Chaque table a entre 10 et 20 lignes.
- [ ] Au moins une colonne « ville » pour démontrer la recherche `LIKE %Lyon%`.
- [ ] Au moins une colonne booléenne (`paye`) pour démontrer *« qui n'a pas payé ? »*.

## Référence
- `rules/project.md` — exigence de 2 bases de domaines différents.
- `rules/demo.md` — script qui s'appuie sur ces 2 bases.
