---
name: export-pdf
description: Implémente l'export PDF « courrier prêt à envoyer » de la vue active. Cas d'usage primaire de Claire (62 ans, présidente d'association) issu du brainstorming. À utiliser pour ajouter le bouton 📄 PDF dans la topbar.
---

# Skill : export-pdf

## Pourquoi ce skill existe
Issu du brainstorming (Desktop 1) :
> *« Export CSV / Export PDF (courrier) »*

Claire ne veut pas seulement un fichier de données. Elle veut **un document imprimable** qu'elle peut joindre à un courrier postal aux adhérents. Le PDF est plus proche de son besoin réel que le CSV.

## Règles UX
- **Bouton 📄 PDF** dans la topbar à droite, à côté de **⬇ CSV**.
- Libellé court : `📄 PDF`. Tooltip : *« Exporter en PDF (prêt à imprimer). »*
- Désactivé si aucune table active OU table vide. Tooltip : *« Choisissez une table pour exporter. »*
- Un clic = un téléchargement. Pas de modale de configuration.
- Nom de fichier : `{table-humanisée}-{YYYY-MM-DD}.pdf` (ex. `Adherents-2026-05-04.pdf`).
- Toast après téléchargement : *« Document téléchargé. »*

## Contenu du PDF (gabarit unique, sobre, imprimable)

```
┌─────────────────────────────────────────────────────┐
│  Adhérents                                         │   ← Titre table humanisé
│  Extrait du 4 mai 2026                             │   ← date FR
├─────────────────────────────────────────────────────┤
│  Filtre actif : "Lyon"     (si recherche en cours) │
│  12 lignes                                          │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │ Nom    │ Prénom │ Ville │ Téléphone        │   │
│  ├────────┼────────┼───────┼──────────────────┤   │
│  │ Dupont │ Marie  │ Lyon  │ 04 78 12 34 56   │   │
│  │ …                                            │   │
│  └─────────────────────────────────────────────┘   │
│                                                    │
│  Page 1 / 2                  Mode lecture seule 🔒 │
└─────────────────────────────────────────────────────┘
```

- Format **A4 portrait**, marges 18 mm.
- Police lisible (≥ 11 pt). Helvetica par défaut.
- Pied de page : *« Page X / N »* à gauche, mention *« Mode lecture seule 🔒 »* à droite.
- En-tête répété sur chaque page.
- Si plus de N colonnes que la page peut contenir → **bascule automatique en paysage**, pas de troncature silencieuse.

## Données exportées
Mêmes règles que `export-csv.md` :
- Libellés humanisés en en-tête, jamais les noms techniques.
- `NULL` → cellule vide.
- Booléens → `Oui` / `Non`.
- Dates → `DD/MM/YYYY`.
- Filtres de recherche appliqués.
- **Toutes les pages** du tableau, pas seulement la page courante.

## Choix techniques
**Librairie : `jsPDF` + `jspdf-autotable`** (standard du marché, léger, pur navigateur).
- Pas de génération côté serveur (cohérent avec sql.js dans le navigateur).
- Pas de WeasyPrint, pas de PDFKit Node, pas de Chromium headless.

## Architecture (rappel `code-style.md`)

```ts
// lib/PdfExporter.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Schema, Row } from './types';

export class PdfExporter {
  constructor(
    private readonly humanizer: Humanizer,
  ) {}

  export(tableName: string, rows: Row[], schema: Schema, filter?: string): Blob {
    const tableSchema = schema.tables.find(t => t.name === tableName)!;
    const cols = tableSchema.columns;
    const orientation = cols.length > 6 ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    this.#header(doc, this.humanizer.humanizeTable(tableName), rows.length, filter);

    autoTable(doc, {
      startY: 32,
      head: [cols.map(c => c.label)],
      body: rows.map(row => cols.map(c => this.#format(row[c.name], c.type))),
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30 },
      didDrawPage: (data) => this.#footer(doc, data.pageNumber, doc.getNumberOfPages()),
    });

    return doc.output('blob');
  }

  filename(tableLabel: string): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${tableLabel}-${date}.pdf`;
  }

  #header(doc: jsPDF, title: string, count: number, filter?: string) {
    doc.setFontSize(16); doc.text(title, 18, 18);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Extrait du ${this.#today()}`, 18, 24);
    if (filter) doc.text(`Filtre actif : "${filter}"  ·  ${count} lignes`, 18, 29);
    else doc.text(`${count} lignes`, 18, 29);
    doc.setTextColor(0);
  }

  #footer(doc: jsPDF, page: number, total: number) {
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(9); doc.setTextColor(120);
    doc.text(`Page ${page} / ${total}`, 18, h - 8);
    doc.text('Mode lecture seule 🔒', w - 18, h - 8, { align: 'right' });
    doc.setTextColor(0);
  }

  #format(value: unknown, type: ColumnInfo['type']): string {
    if (value === null || value === undefined) return '';
    if (type === 'bool') return value ? 'Oui' : 'Non';
    if (type === 'date') return this.#toFrenchDate(String(value));
    return String(value);
  }

  #today(): string {
    return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  #toFrenchDate(iso: string): string {
    const [y, m, d] = iso.slice(0, 10).split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }
}
```

## Cas limites
- Très grande table (> 5 000 lignes) → afficher *« Préparation du document… »* puis téléchargement.
- Beaucoup de colonnes (> 10) → paysage automatique. Si toujours trop large, prévenir : *« Le tableau a été ajusté pour tenir sur la page. »*
- Caractères accentués → vérifier que la police par défaut les supporte (Helvetica de jsPDF OK pour Latin-1).

## Anti-règles
- ❌ Pas de configuration (orientation, marges, colonnes…) — ajoute de la complexité.
- ❌ Pas de mise en page « riche » (logos, couleurs vives) — Claire imprime en noir et blanc.
- ❌ Pas de génération serveur — l'app reste 100 % navigateur.
- ❌ Pas d'export d'une seule page — toujours l'intégralité du résultat filtré.

## Référence
- `rules/ux.md` — wording « courrier ».
- `rules/ui-layout.md` — position du bouton dans la topbar.
- `skills/export-csv.md` — règles partagées de formatage des données.
- `rules/code-style.md` — classe `PdfExporter` dans `/lib`.
