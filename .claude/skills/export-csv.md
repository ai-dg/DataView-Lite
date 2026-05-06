---
name: export-csv
description: Implémente l'export CSV de la vue active (table ou résultat de recherche) pour le cas d'usage « courrier prêt à coller » de Claire. À utiliser pour ajouter le bouton ⬇ CSV en bas de la zone centrale.
---

# Skill : export-csv

## Pourquoi ce skill existe
Issu du brainstorming : *« Exporter pour un courrier, donc prêt à copier coller. »*
Claire (62 ans, présidente d'association) veut récupérer la liste des membres pour rédiger un courrier. **L'export n'est pas un bonus** : c'est un cas d'usage primaire pour une persona.

## Règles UX
- **Bouton visible** en bas à droite de la zone centrale, libellé explicite : **« ⬇ Exporter en CSV »**.
- Pas de modale de configuration : un clic = un téléchargement.
- Nom de fichier auto : `{table-humanisée}-{YYYY-MM-DD}.csv` (ex. `Clients-2026-05-04.csv`).
- Le CSV exporte **ce que l'utilisateur voit** :
  - colonnes humanisées en en-tête (pas les noms techniques),
  - filtres de recherche appliqués,
  - **toutes les pages** (pas seulement la page courante — Claire ne s'en rendra pas compte sinon).
- Si le résultat est vide → bouton désactivé + tooltip *« Rien à exporter pour le moment. »*
- Toast de confirmation : *« Fichier téléchargé. »* (2 s, en bas).

## Format CSV
- Séparateur : **`;`** (Excel France ouvre directement).
- Encodage : **UTF-8 avec BOM** (sinon Excel casse les accents).
- Fin de ligne : `\r\n`.
- Échappement : double-guillemet pour les valeurs contenant `;`, `"`, `\n`.
- Valeurs `NULL` → cellule vide (jamais le mot `NULL`).
- Booléens → `Oui` / `Non` (jamais `true` / `false`).
- Dates ISO → format français `DD/MM/YYYY` si la colonne est typée date.

## Architecture (rappel `code-style.md`)
Une classe dédiée dans `/lib`, pas un helper anonyme.

```ts
// lib/CsvExporter.ts
import type { Schema, Row } from './types';

export class CsvExporter {
  constructor(
    private readonly humanizer: Humanizer,
    private readonly delimiter = ';',
  ) {}

  export(tableName: string, rows: Row[], schema: Schema): Blob {
    const cols = schema.tables.find(t => t.name === tableName)!.columns;
    const header = cols.map(c => this.#escape(c.label)).join(this.delimiter);
    const body = rows
      .map(row => cols.map(c => this.#format(row[c.name], c.type)).join(this.delimiter))
      .join('\r\n');
    const bom = '﻿';
    return new Blob([bom + header + '\r\n' + body], { type: 'text/csv;charset=utf-8' });
  }

  filename(tableLabel: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${tableLabel}-${date}.csv`;
  }

  #format(value: unknown, type: ColumnInfo['type']): string {
    if (value === null || value === undefined) return '';
    if (type === 'bool') return value ? 'Oui' : 'Non';
    if (type === 'date') return this.#toFrenchDate(String(value));
    return this.#escape(String(value));
  }

  #escape(s: string): string {
    if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  #toFrenchDate(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }
}
```

## Câblage côté composant
```tsx
// dans TableView.tsx
const onExport = () => {
  const blob = exporter.export(activeTable, allRows, schema);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exporter.filename(humanizer.humanizeTable(activeTable));
  a.click();
  URL.revokeObjectURL(url);
  toast('Fichier téléchargé.');
};
```

## Cas limites
- Très grande table (>10 000 lignes) → export OK mais on **prévient** : *« Préparation du fichier… »* puis téléchargement. Pas de blocage UI.
- Table sans données → bouton désactivé.
- Caractères spéciaux dans le nom de table (`tbl_éà`) → `slugify` côté nom de fichier.

## Anti-règles
- ❌ Pas de configuration d'export (séparateur, colonnes à inclure…) — ajoute de la complexité, pas pour Claire.
- ❌ Pas d'export Excel `.xlsx` — librairie lourde, hors POC. CSV suffit.
- ❌ Pas d'export de plusieurs tables d'un coup.

## Référence
- `rules/ux.md` — wording « courrier prêt à coller ».
- `rules/ui-layout.md` — position du bouton dans le footer table.
- `rules/code-style.md` — classe `CsvExporter` dans `/lib`.
