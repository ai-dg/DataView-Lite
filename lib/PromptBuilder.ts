import type {
  CellValue,
  ChatMessage,
  Schema,
  SchemaContext,
  TableInfo,
} from './types';

const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHARS = 240;

/**
 * Builds the prompts sent to the LLM. Pure: no IO, no side effects.
 */
export class PromptBuilder {
  /**
   * Builds the SQL generation prompt for qwen2.5-coder (or any chat model).
   * Output contract: a single JSON object on stdout, no markdown, no commentary.
   */
  static sql(
    schema: Schema,
    question: string,
    currentTable?: string,
    history: ChatMessage[] = [],
    context: SchemaContext | null = null,
  ): string {
    const digest = digestSchema(schema);
    const focus = currentTable
      ? `Si la question est ambiguë, privilégie la table « ${currentTable} ».`
      : '';
    const historyBlock = formatHistory(history);
    const contextBlock = formatContext(context);

    return [
      'Tu génères une requête SQL SQLite en LECTURE SEULE pour répondre à une question utilisateur.',
      '',
      'RÈGLES STRICTES :',
      '1. Une seule requête SELECT (ou WITH ... SELECT). Pas de point-virgule final, pas de plusieurs requêtes.',
      '2. Interdits : INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, REPLACE, ATTACH, DETACH, VACUUM, PRAGMA.',
      '3. Utilise EXACTEMENT les noms de tables et de colonnes du schéma fourni. Aucune invention.',
      '4. Ajoute LIMIT 100 sauf si la requête est un agrégat (COUNT, SUM, AVG, MIN, MAX) seul.',
      '5. Réponds UNIQUEMENT en JSON valide — aucun texte hors JSON, aucun markdown.',
      `6. PRIORITÉ DE TABLE : si la question nomme explicitement une table (par son nom brut OU son label humanisé visible dans le SCHÉMA), utilise CETTE table, pas la table active. ${focus}`,
      "7. SUIVI DE CONVERSATION (à n'utiliser QU'AVEC PRUDENCE) : ne reprends les filtres (WHERE) ou la table de l'HISTORIQUE que si la QUESTION ACTUELLE est explicitement une suite — c'est-à-dire qu'elle contient un mot anaphorique ET aucun nouveau sujet :",
      '   - Mots anaphoriques : « ces », « ceux-là », « celles-ci », « lesquels », « leurs », « pour ces … », « la même chose pour … », « et pour X ? ».',
      "   - SI la question nomme une autre table, un autre nom propre, OU est une question autonome (« combien de lignes dans X ? », « liste les Y »), IGNORE l'historique.",
      '   Exemple A — suivi légitime :',
      '     Précédent : « Combien de véhicules Renault ? »',
      '     Actuel    : « Quels sont leurs prochains entretiens ? »',
      "     Attendu   : SELECT next_service_date FROM vehicles WHERE make = 'Renault' …",
      '   Exemple B — question autonome, on ignore l’historique :',
      '     Précédent : « Combien d’éléments ce mois-ci ? »',
      '     Actuel    : « Combien de lignes dans membres ? »',
      '     Attendu   : SELECT COUNT(*) FROM members  (PAS de filtre date)',
      "8. Si la question mentionne un nom propre (personne, ville, référence inconnue du schéma), filtre les colonnes texte pertinentes avec LIKE '%nom%'.",
      "9. « Qui n'a pas payé / réglé / soldé » → filtre la colonne booléenne payé/paid à 0, ou la date de paiement à NULL.",
      "10. « Ce mois-ci », « cette année » → utilise strftime('%Y-%m', col_date) ou strftime('%Y', col_date) avec la DATE DU JOUR fournie ci-dessous.",
      '',
      'FORMAT DE SORTIE :',
      '{',
      '  "sql": "SELECT ...",',
      '  "displayHint": "number" | "table" | "text",',
      '  "needsClarification": false',
      '}',
      '',
      'Si la question est trop floue pour générer du SQL en confiance, retourne plutôt :',
      '{ "sql": "", "needsClarification": true, "reason": "raison courte en français" }',
      '',
      `DATE DU JOUR : ${new Date().toISOString().slice(0, 10)}`,
      contextBlock ? `CONTEXTE GLOBAL :\n${contextBlock}` : '',
      `SCHÉMA : ${digest}`,
      '',
      historyBlock
        ? `HISTORIQUE (anciens échanges, du plus ancien au plus récent) :\n${historyBlock}\n`
        : '',
      `QUESTION ACTUELLE : "${question.replace(/"/g, '\\"')}"`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Builds the explanation prompt for llama3.2:3b.
   * The LLM only sees the *result rows* (truncated) — never the SQL, never
   * the schema, never the user's data outside what's in the result.
   * Returns a single French sentence.
   */
  static explain(
    question: string,
    rows: Record<string, CellValue>[],
    history: ChatMessage[] = [],
    truncateTo = 20,
    intent: 'describe' | 'summary' | null = null,
    tableInfo: TableInfo | null = null,
    context: SchemaContext | null = null,
  ): string {
    const sample = rows.slice(0, truncateTo);
    const total = rows.length;
    const historyBlock = formatHistory(history);
    const contextBlock = formatContext(context);

    // Description intent: the user asked « c'est quoi cette table ? ».
    // Llama gets the schema metadata + a few sample rows and must produce
    // a one-sentence description of the table (NOT enumerate the rows).
    if (intent === 'describe' && tableInfo) {
      const tablePurpose = context?.tables[tableInfo.name];
      return [
        "Tu décris une table de données à un utilisateur non technique, en français, sur un ton chaleureux, humain et naturel — comme un collègue bienveillant qui prend le temps d'expliquer.",
        '',
        'RÈGLES :',
        "1. TROIS À QUATRE phrases courtes, fluides, sans jargon, sans SQL, sans nom de colonne brut.",
        "2. Phrase d'introduction : reformule ce que contient la table avec un verbe vivant — VARIE l'ouverture, n'écris JAMAIS toujours « Cette table contient ». Inspire-toi d'amorces différentes : « Vous avez ici … », « Cette table regroupe … », « On y retrouve … », « Voici l'ensemble des … », « Il s'agit ici de … ».",
        "3. Phrase descriptive : évoque les informations disponibles en t'appuyant sur les libellés des colonnes (par ex. « avec leur date, leur lieu, le nombre de participants… »). Sois concret mais sans citer de valeur particulière.",
        "4. Phrase de volume : annonce combien d'enregistrements y figurent, en utilisant un mot vivant (« on y compte… », « elle réunit… », « elle rassemble… », « vous y trouverez au total… »).",
        "5. Phrase d'invitation : termine par une proposition d'aide chaleureuse et VARIÉE : « N'hésitez pas à me demander… », « Que puis-je faire pour vous ? », « Souhaitez-vous que je vous aide à explorer un aspect en particulier ? », « Posez-moi vos questions, je suis là pour ça. »",
        "6. INTERDIT : citer un nom propre, une ville, une date, ou toute valeur de l'échantillon. INTERDIT d'inventer une colonne absente du schéma.",
        '',
        contextBlock ? `CONTEXTE GLOBAL :\n${contextBlock}\n` : '',
        tablePurpose ? `RÔLE CONNU DE LA TABLE : ${tablePurpose}` : '',
        `LIBELLÉ DE LA TABLE : ${tableInfo.label}`,
        `NOMBRE TOTAL DE LIGNES : ${tableInfo.rowCount}`,
        `COLONNES (à utiliser pour évoquer les informations) : ${tableInfo.columns.map((c) => c.label).join(', ')}`,
        `ÉCHANTILLON DE LIGNES (UNIQUEMENT pour comprendre le contenu, NE PAS CITER) : ${JSON.stringify(sample.slice(0, 3))}`,
        '',
        `QUESTION : "${question.replace(/"/g, '\\"')}"`,
        '',
        "Réponds par 3 à 4 phrases françaises, chaleureuses et variées, qui décrivent la table et terminent par une invitation à poser une question. Évite absolument la formulation rigide qui commence à chaque fois par « Cette table contient ».",
      ]
        .filter(Boolean)
        .join('\n');
    }

    // « Résume cette table » → produire UNE phrase humaine qui décrit
    // le contenu (rôle de la table + nombre de lignes), pas une enumeration.
    if (intent === 'summary' && tableInfo) {
      const tablePurpose = context?.tables[tableInfo.name];
      return [
        "Tu résumes une table de données pour un utilisateur non technique, en français, sur un ton chaleureux, humain et naturel — comme un collègue qui prend le temps de présenter les choses.",
        '',
        'RÈGLES :',
        "1. TROIS À QUATRE phrases courtes, fluides, sans jargon, sans SQL, sans nom de colonne brut.",
        "2. Phrase d'ouverture : présente la table avec un verbe vivant et VARIÉ — n'écris JAMAIS systématiquement « Voici un aperçu de … ». Inspire-toi : « Vous trouverez ici … », « Cette table regroupe … », « On y retrouve … », « Il s'agit ici de … », « Cette section rassemble … ».",
        "3. Phrase descriptive : décris le type d'informations disponibles à partir des libellés de colonnes (par ex. « avec leur date, leur lieu, leur montant… »). Concret, sans citer de valeurs.",
        "4. Phrase de volume : indique le nombre total de lignes avec un verbe varié (« on y compte… », « elle rassemble… », « elle réunit au total… »).",
        "5. Phrase d'invitation : termine par une proposition d'aide chaleureuse et VARIÉE : « N'hésitez pas à me demander… », « Que puis-je faire pour vous ? », « Souhaitez-vous que je creuse un aspect en particulier ? », « Posez-moi vos questions, je suis là pour ça. »",
        "6. INTERDIT : citer une valeur précise (nom propre, ville, date) de l'extrait. INTERDIT d'inventer un champ absent du schéma.",
        '',
        contextBlock ? `CONTEXTE GLOBAL :\n${contextBlock}\n` : '',
        tablePurpose ? `RÔLE CONNU DE LA TABLE : ${tablePurpose}` : '',
        `LIBELLÉ DE LA TABLE : ${tableInfo.label}`,
        `NOMBRE TOTAL DE LIGNES : ${tableInfo.rowCount}`,
        `COLONNES (à utiliser pour évoquer les informations sans les nommer techniquement) : ${tableInfo.columns.map((c) => c.label).join(', ')}`,
        `EXTRAIT DE LIGNES (UNIQUEMENT pour comprendre le type de contenu, NE PAS CITER) : ${JSON.stringify(sample.slice(0, 3))}`,
        '',
        `QUESTION : "${question.replace(/"/g, '\\"')}"`,
        '',
        "Réponds par 3 à 4 phrases françaises, chaleureuses et variées, qui décrivent la table et terminent par une invitation à poser une question. Varie systématiquement les amorces — n'utilise pas deux fois le même verbe d'introduction.",
      ]
        .filter(Boolean)
        .join('\n');
    }

    // Detect the SCALAR case (one row, one value): typical COUNT/SUM/AVG result.
    // For Llama this is the most error-prone case: it confuses « 1 row » with « value 1 ».
    const isScalar = total === 1 && Object.keys(rows[0]).length === 1;
    const scalarValue = isScalar ? Object.values(rows[0])[0] : null;

    const lines: string[] = [
      'Tu réponds à un utilisateur non technique en français.',
      '',
      'RÈGLES STRICTES :',
      '1. UNE seule phrase, courte, chaleureuse, en français.',
      '2. Pas de SQL, pas de noms de colonnes bruts, pas de jargon technique.',
      "3. INTERDIT D'INVENTER : utilise uniquement les chiffres et les valeurs ci-dessous.",
      '',
    ];

    if (isScalar) {
      lines.push(
        'CAS : agrégat (un seul nombre demandé).',
        `LA VALEUR EXACTE À COMMUNIQUER EST : ${JSON.stringify(scalarValue)}`,
        `Formule ta phrase autour de cette valeur. Exemple : « Il y a ${scalarValue} … » ou « Le total est de ${scalarValue} … ».`,
        "NE DIS JAMAIS « 1 ligne », « un seul résultat », « aucun résultat » : le résultat technique contient toujours 1 ligne mais ce qui compte est LA VALEUR.",
      );
    } else if (total === 0) {
      lines.push(
        'CAS : aucun résultat trouvé.',
        'Dis simplement, en une phrase, qu’il n’y a aucun résultat correspondant à la question.',
      );
    } else {
      lines.push(
        `CAS : liste de ${total} ligne(s).`,
        `Commence par leur nombre exact (« J'ai trouvé ${total} résultats… ») ou cite-les si elles tiennent dans une phrase.`,
        "INTERDIT : ne dis jamais « aucun », « personne », « rien » alors que le résultat contient des lignes.",
      );
    }

    lines.push(
      '',
      contextBlock ? `CONTEXTE GLOBAL :\n${contextBlock}` : '',
      historyBlock ? `HISTORIQUE :\n${historyBlock}` : '',
      `QUESTION ACTUELLE : "${question.replace(/"/g, '\\"')}"`,
      `RÉSULTAT BRUT (JSON, ${total} ligne(s) max ${truncateTo}) : ${JSON.stringify(sample)}`,
      '',
      'Réponds par UNE SEULE phrase en français, strictement fidèle aux instructions ci-dessus.',
    );

    return lines.filter(Boolean).join('\n');
  }

  /**
   * Builds a humanised clarification prompt for the chat model.
   * Used when the SQL model says it cannot answer (off-topic, ambiguous,
   * or unrelated question). The model must explain in 2 short French
   * sentences what the database is about and gently suggest reformulation.
   */
  static clarify(
    question: string,
    schema: Schema,
    context: SchemaContext | null,
  ): string {
    const contextBlock = formatContext(context);
    const tableList = schema.tables
      .slice(0, 8)
      .map((t) => `  - ${t.label} (${t.rowCount} ligne(s))`)
      .join('\n');

    return [
      "Tu réponds à un utilisateur non technique en français. Sa question ne correspond visiblement PAS au contenu de la base.",
      '',
      'RÈGLES STRICTES :',
      '1. DEUX phrases maximum, chaleureuses, sans jargon, sans SQL.',
      '2. Phrase 1 : explique en termes simples CE QUE CONTIENT la base (domaine + vue d’ensemble).',
      '3. Phrase 2 : invite gentiment l’utilisateur à reformuler en mentionnant 2 ou 3 sujets pertinents tirés des tables disponibles.',
      "4. Ne dis JAMAIS « je ne comprends pas » sèchement. Reste positif.",
      '5. N’invente AUCUNE table, colonne ou information absente du contexte.',
      "6. Si la question évoque un sujet absent (ex. clowns, cirque) sans rapport avec la base, reconnais-le doucement sans le moquer.",
      '',
      contextBlock ? `CONTEXTE GLOBAL :\n${contextBlock}\n` : '',
      `TABLES DISPONIBLES :\n${tableList}`,
      '',
      `QUESTION POSÉE : "${question.replace(/"/g, '\\"')}"`,
      '',
      'Réponds en deux phrases françaises maximum, séparées par un espace.',
    ]
      .filter(Boolean)
      .join('\n');
  }
}

function formatContext(context: SchemaContext | null): string {
  if (!context) return '';
  const tableLines = Object.entries(context.tables)
    .map(([name, purpose]) => `  - ${name} : ${purpose}`)
    .join('\n');
  return [
    `Domaine : ${context.domain}`,
    `Vue d'ensemble : ${context.summary}`,
    'Rôle des tables :',
    tableLines,
  ].join('\n');
}

function formatHistory(history: ChatMessage[]): string {
  if (!history || history.length === 0) return '';
  const recent = history.slice(-MAX_HISTORY_TURNS);
  return recent
    .map((m) => {
      const speaker = m.role === 'user' ? 'Utilisateur' : 'Assistant';
      const text = (m.text ?? '').trim().slice(0, MAX_HISTORY_CHARS);
      return `- ${speaker} : ${text}`;
    })
    .join('\n');
}

function digestSchema(schema: Schema): string {
  // Compact JSON: tables + columns (key, label, type) + rowCount.
  const tables = schema.tables.map((t) => ({
    name: t.name,
    label: t.label,
    rows: t.rowCount,
    columns: t.columns.map((c) => ({ name: c.key, label: c.label, type: c.type })),
  }));
  return JSON.stringify({ tables });
}
