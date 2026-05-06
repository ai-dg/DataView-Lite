import type { Column, Schema, TableInfo } from './types';

/**
 * Heuristic question suggestions, derived from the schema only.
 * No LLM call. French wording. Persona-aware: the heuristics map common
 * column shapes to the kind of question Martine (PME), Youssef (e-commerce)
 * or Claire (association) would actually ask.
 *
 * Goals:
 *   - always 3 suggestions, contextual to the active table.
 *   - prefer concrete, actionable questions over generic ones.
 */
export class Suggester {
  static forSchema(schema: Schema, currentTable?: string): string[] {
    if (schema.tables.length === 0) {
      return ['Cette base semble vide.', 'Téléversez une autre base.'];
    }

    const focus = pickFocusTable(schema, currentTable);
    const others = schema.tables.filter((t) => t.name !== focus.name);

    const out: string[] = [];
    const seen = new Set<string>();
    const add = (q: string) => {
      if (!seen.has(q)) {
        seen.add(q);
        out.push(q);
      }
    };

    // Always offer the universal first question.
    add(`Combien de lignes contient ${focus.label.toLowerCase()} ?`);

    // Persona-aware heuristics, ordered by specificity.
    const stockCol = pickColumn(focus.columns, /(stock|qty|quantity|inventory|on_hand)$/i);
    const lowStockCol = pickColumn(focus.columns, /(low_stock|threshold|min_lvl|alert)/i);
    const paidCol = pickColumn(focus.columns, /^(paid|paye|impaye|is_paid|pd|due)$/i);
    const dateCol = focus.columns.find(
      (c) => c.type === 'date' || /(_at|_on|date|year)$/i.test(c.key),
    );
    const cityCol = pickColumn(focus.columns, /(city|ville|town|locality|addr_city)$/i);
    const statusCol = pickColumn(focus.columns, /(status|statut|state|st_flag)$/i);
    const priceCol = pickColumn(focus.columns, /(price|prix|amount|montant|total|net|gross)$/i);
    const nameCol = pickColumn(focus.columns, /(name|nom|full_name|nm_full|title|titre)$/i);

    // Youssef — e-commerce: stock, ventes du mois.
    if (stockCol && lowStockCol) {
      add('Quels articles sont en rupture ou en stock faible ?');
    } else if (stockCol) {
      add(`Quels ${focus.label.toLowerCase()} ont moins de 5 unités en stock ?`);
    }

    // Claire — association : qui n'a pas payé sa cotisation.
    if (paidCol) {
      add(`Qui n'a pas encore payé ?`);
    }

    // Martine — PME : stat sur le mois en cours.
    if (dateCol && priceCol) {
      add('Quel est le total ce mois-ci ?');
    } else if (dateCol) {
      add('Combien d’éléments ce mois-ci ?');
    }

    // Generic geographic filter.
    if (cityCol && nameCol) {
      add(`Liste les ${focus.label.toLowerCase()} de Lyon`);
    }

    // Status breakdown is useful in many domains.
    if (statusCol && out.length < 3) {
      add(`Combien de ${focus.label.toLowerCase()} par statut ?`);
    }

    // Cross-table reminder when nothing else fits.
    if (others.length > 0 && out.length < 3) {
      add(`Combien de lignes dans ${others[0].label.toLowerCase()} ?`);
    }

    if (out.length < 3) add('Résume cette table');
    if (out.length < 3) add('Montre les derniers enregistrements');

    return out.slice(0, 3);
  }
}

function pickFocusTable(schema: Schema, currentTable?: string): TableInfo {
  if (currentTable) {
    const hit = schema.tables.find((t) => t.name === currentTable);
    if (hit) return hit;
  }
  return schema.tables[0]!;
}

function pickColumn(columns: Column[], pattern: RegExp): Column | undefined {
  return columns.find((c) => pattern.test(c.key));
}
