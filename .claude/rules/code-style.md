# code-style.md

## Principe directeur
**Programmation modulaire orientée objet, lisible par un humain.**
Pas de programmation fonctionnelle pure, pas de chaînes de `pipe()` cryptiques, pas de helpers anonymes empilés. On préfère **des classes nommées avec des responsabilités claires**, qu'un développeur (ou Martine, si elle apprend TypeScript dans 5 ans) puisse ouvrir et comprendre.

Cette règle se combine avec la règle d'arbitrage : **UX > code**. Donc OOP **pragmatique**, pas OOP académique.

## Style attendu

### ✅ À faire
- **Une classe = une responsabilité claire.** Nom au singulier, comportement cohérent.
- **Méthodes courtes** (≤ 30 lignes idéalement). Un nom de méthode = une intention.
- **Propriétés privées** quand l'extérieur n'a pas à savoir (`#field` ou `private`).
- **Constructeur explicite** : on injecte les dépendances en paramètre, on ne va pas chercher de singletons cachés.
- **Types explicites** sur les signatures publiques (TypeScript). Les types internes peuvent être inférés.
- **Erreurs typées** : une classe d'erreur dédiée par cas non trivial (`SchemaIntrospectionError`, `LlmTimeoutError`).
- **Commentaires sur le “pourquoi”**, jamais sur le “quoi”. Le code dit le quoi.

### ❌ À éviter
- Programmation fonctionnelle dogmatique : pas de `R.pipe`, pas de `flow(...)`, pas de monades maison.
- Helpers anonymes orphelins dans `lib/utils.ts` qui ne savent plus à qui ils appartiennent.
- Classes-fourre-tout (`Manager`, `Helper`, `Service` qui fait 12 choses).
- Héritage profond. Préférer la **composition**.
- Abstractions prématurées : pas d'interface si une seule implémentation existe.
- Decorators, mixins, métaprogrammation, DI containers.
- Getters/setters vides qui ne font qu'exposer un champ — exposer le champ directement.

## Architecture cible (rappel `architecture.md`)

Les modules métier vivent comme **classes** dans `/lib`, utilisés comme dépendances par les composants React (qui restent fonctionnels — c'est l'idiome React).

```
/lib
  Database.ts        # class Database — wrapper sql.js (load, query, close)
  Introspector.ts    # class Introspector — extrait Schema depuis sqlite_master
  Humanizer.ts       # class Humanizer — règles + dictionnaire FR + cache
  LlmClient.ts       # class LlmClient — callOllama() + prompts + mock
  SqlGuard.ts        # class SqlGuard — validation regex anti-écriture
  errors.ts          # classes d'erreurs typées
```

Les **composants React** restent fonctionnels (hooks) : c'est la convention React, on ne se bat pas contre l'écosystème. Mais la logique métier est **dans des classes**, jamais éparpillée dans des `useEffect`.

## Exemple — `Humanizer`

```ts
// lib/Humanizer.ts
import type { Schema, ColumnInfo } from './types';

export class Humanizer {
  readonly #dictionary: Map<string, string>;

  constructor(dictionary: Record<string, string>) {
    this.#dictionary = new Map(Object.entries(dictionary));
  }

  humanizeTable(rawName: string): string {
    return this.#strip(rawName)
      .split('_')
      .map(word => this.#dictionary.get(word) ?? this.#capitalize(word))
      .join(' ');
  }

  humanizeColumn(rawName: string): string {
    // Why: les colonnes techniques (id, fk_*) sont souvent à masquer en UI.
    if (this.#isTechnical(rawName)) return '';
    return this.humanizeTable(rawName);
  }

  #strip(name: string): string {
    return name.replace(/^(tbl_|t_|usr_|tmp_)/, '').replace(/_(v\d+|old|\d{4})$/, '');
  }

  #capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  #isTechnical(name: string): boolean {
    return /^(id|fk_|_pk)$/i.test(name);
  }
}
```

Lecture : 5 minutes pour qu'un nouvel arrivant comprenne la classe entière. C'est l'objectif.

## Exemple — `LlmClient` (composition, pas héritage)

```ts
// lib/LlmClient.ts
export class LlmClient {
  constructor(
    private readonly endpoint: string,
    private readonly timeoutMs = 5_000,
  ) {}

  async generate(model: 'qwen2.5-coder:7b' | 'llama3.2:3b', prompt: string): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new LlmTimeoutError(`Ollama ${res.status}`);
      return (await res.json()).response;
    } finally {
      clearTimeout(timer);
    }
  }
}

export class MockLlmClient {
  async generate(_model: string, prompt: string): Promise<string> {
    return JSON.stringify(mockHeuristic(prompt));
  }
}
```

Pas d'interface `ILlmClient` partagée tant qu'on n'en a pas besoin : les deux classes ont la même méthode `generate`, le typage structurel de TS fait le reste.

## Conventions de nommage

| Élément | Convention | Exemple |
|---|---|---|
| Classe | `PascalCase`, nom au singulier | `Introspector` |
| Méthode | `camelCase`, verbe d'action | `humanizeTable` |
| Propriété privée | `#nom` ou `private nom` | `#dictionary` |
| Type / Interface | `PascalCase` | `Schema`, `ColumnInfo` |
| Erreur | `XxxError` | `LlmTimeoutError` |
| Fichier | nom de la classe principale | `Humanizer.ts` |
| Composant React | `PascalCase.tsx` | `TableView.tsx` |

## Découpage des fichiers
- **Une classe principale par fichier**, du même nom.
- Helpers privés dans le même fichier, pas exportés.
- Types partagés dans `lib/types.ts`.
- Erreurs partagées dans `lib/errors.ts`.

## Tests
Pas de tests dans le périmètre POC. Mais **structure le code comme s'il devait être testable** : dépendances injectées, pas de singletons cachés, pas d'appels réseau dans les constructeurs.

## Priorité face à la règle « UX > code »
- Si un raccourci sale fait gagner 10 min sur l'UX → on l'accepte, mais on **isole la dette** dans une seule classe ou un seul fichier marqué `// TODO: refactor`.
- On ne mélange pas le hack à la couche propre.

## Référence
- `rules/architecture.md` — découpage des modules.
- `rules/constraints.md` — anti sur-ingénierie (s'applique aussi ici).
- `agents/code-architect.md` — relit le code modulaire.
