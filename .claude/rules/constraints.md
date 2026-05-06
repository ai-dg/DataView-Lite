# constraints.md

## Règle d'arbitrage prioritaire (au-dessus de tout)
**UX simple > qualité du code / complétude technique.**

En cas de conflit entre une UX plus claire et un code plus propre/complet, **l'UX gagne**. Un raccourci sale qui rend l'écran limpide est préférable à une abstraction propre qui complique l'expérience. Cette règle ne s'applique pas aux contraintes dures (single-page, lecture seule, généricité, zéro jargon) — qui sont elles-mêmes de l'UX fondamentale.

## Interdictions (rouges)
- ❌ **Hardcoder** un nom de table ou de colonne où que ce soit dans le code.
- ❌ **Multi-pages** ou routing. Une seule URL, une seule vue.
- ❌ Afficher du **SQL**, des **types techniques** (`VARCHAR`, `INTEGER`), ou du **jargon** (`PRIMARY KEY`, `NULL`).
- ❌ Toute opération **d'écriture** sur la base (INSERT, UPDATE, DELETE, DROP, ALTER).
- ❌ **Sur-ingénierie** : pas d'ORM, pas de Redux, pas de design system maison, pas de monorepo.
- ❌ Tests automatisés, CI/CD, déploiement, auth — hors périmètre d'évaluation.
- ❌ **Multi-agents**, orchestrateurs (LangChain agents, AutoGen, etc.), chaînes conditionnelles complexes.
- ❌ Mélanger les rôles des modèles : `qwen2.5-coder` ne fait QUE du SQL, `llama3.2` ne fait QUE de l'explication.
- ❌ Plus de **2 appels LLM** par question utilisateur.
- ❌ Faire **planter** l'app si Ollama est absent ou lent : fallback mock obligatoire.
- ❌ Envoyer les données au modèle SQL. Le résultat envoyé à `llama3.2` est tronqué (max 20 lignes).

## Obligations (vertes)
- ✅ **Générique** : doit marcher sur n'importe quel `.sqlite` valide.
- ✅ **Lecture seule** affichée et garantie techniquement.
- ✅ **Humanisation dynamique** des noms de tables/colonnes.
- ✅ **Single-page** : sidebar + main + assistant cohabitent.
- ✅ Au moins **2 bases SQLite** de domaines différents pour la démo.
- ✅ Wording **100 % français** côté utilisateur.
- ✅ **Mock mode fonctionnel** : l'app tourne sans Ollama installé (démo safe).
- ✅ Appels Ollama **directs** (`fetch` sur `http://localhost:11434/api/generate`), pas de SDK, pas d'abstraction.
- ✅ Toute exception LLM est attrapée et transformée en message FR doux.

## Raccourcis autorisés
- 🟡 **Mock LLM** si Ollama est absent / injoignable / si le temps presse.
- 🟡 Script `scripts/setup-ollama.sh` **optionnel** et **non bloquant** (`exit 0` toujours).
- 🟡 **Pagination naïve** (LIMIT/OFFSET, pas de virtualisation).
- 🟡 **Recherche LIKE %q%** sur les colonnes texte (pas de full-text).
- 🟡 **Heuristiques** pour humaniser (dictionnaire FR + règles), LLM en bonus.
- 🟡 **CSS Tailwind brut**, pas de composants UI lib (Shadcn ok si rapide).
- 🟡 **Pas de gestion d'erreur exhaustive** : un message doux suffit.

## Mockable sans honte
- Réponses de l'assistant IA (réponses pré-câblées sur les bases de démo).
- Résumés de tables (texte statique par table connue).
- Suggestions de questions (3 par table, génération heuristique).

## NON mockable (cœur du sujet)
- L'**introspection du schéma** : doit être réelle et dynamique.
- L'**humanisation des libellés** : doit fonctionner sur une base inconnue.
- La **généricité** sur 2 bases : démontrée en live.

## Stratégie LLM (rappel)
- `qwen2.5-coder:7b` → **SQL uniquement**.
- `llama3.2:3b` → **explication / phrase / fallback UX uniquement**.
- Voir `llm.md` pour le pipeline détaillé et les niveaux de fallback.

## Gestion des échecs (résumé)
1. Ollama OK + 2 modèles → pipeline complet.
2. `llama3.2` manquant → réponse brute formatée par l'UI.
3. `qwen2.5-coder` manquant → mock SQL heuristique.
4. Ollama injoignable → mock mode complet.
5. SQL invalide à l'exécution → message doux + suggestion.
**Aucune erreur LLM ne doit casser l'app.**

## Performance & contraintes
- Timeout Ollama : 5 s max par appel.
- Maximum 2 appels LLM par question.
- Pas de streaming, pas de retry, pas de queue.
- Préférer **fonctions directes** à toute couche d'abstraction.

## Règle d'arbitrage
Si un choix se présente entre :
- A) Faire propre et complet → 30 min
- B) Faire moche mais qui marche → 5 min

Prendre **B** et noter dans le README « ce que je ferais avec plus de temps ».
