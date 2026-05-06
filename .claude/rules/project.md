# project.md

## Résumé du sujet
Prototyper **DataView Lite**, une alternative moderne et accessible à phpMyAdmin pour explorer une base **SQLite** quelconque. L'app doit être **générique** : on branche n'importe quelle base (PME, association, bibliothèque, garage...) et tout fonctionne sans toucher au code.

## Attentes réelles (au-delà du brief)
- Montrer une **capacité produit** : empathie pour des utilisateurs non techniques.
- Montrer une **capacité d'exécution rapide** : sortir un truc qui marche en 2h.
- Montrer une **compréhension de ce qu'on livre** : savoir défendre ses choix.
- Prouver la **généricité** en testant sur **2 bases SQLite de domaines différents**.

## Fonctionnalités demandées
1. **Connecter** un fichier `.sqlite` / `.db` (upload).
2. **Lister les tables** avec libellés humanisés générés dynamiquement.
3. **Explorer une table** dans une vue claire (pas un `SELECT *` brut).
4. **Rechercher** une information via une barre de recherche simple.
5. **Assistant IA** : questions en français naturel → SQL caché → réponse lisible.

## Contraintes UX (PDF)
- Zéro jargon technique visible.
- Navigation évidente (jamais « où je clique ? »).
- Feedback rassurant : badge **« Mode lecture seule »** visible en permanence.

## Contrainte technique (PDF)
- **Aucun** nom de table ou colonne hardcodé.
- Doit fonctionner avec **n'importe quel** fichier SQLite valide.

## Critères d'évaluation (PDF — à internaliser)
| Critère | Ce qu'ils regardent |
|---|---|
| UX / Design | Compréhensible en 5 secondes ? Rassurant, pas « admin panel » ? |
| Généricité | Plusieurs bases sans changement de code ? Libellés dynamiques ? |
| Intégration IA | Comprend les questions simples ? S'adapte au schéma ? Cas limites ? |
| Qualité du code | Lisible, structuré, pragmatique. Pas de sur-ingénierie. |
| Sensibilité produit | Wording, états vides, micro-attentions pour les personas. |

## Ce qui n'est PAS évalué
- Tests
- Déploiement
- Exhaustivité des features
- Edge cases obscurs

## Ce qui compte vraiment
- L'introspection dynamique du schéma (cœur technique).
- L'humanisation des noms (cœur UX).
- Une démo qui « tient » sur 2 bases différentes.

## Ce qui ne compte pas
- Beauté pixel-perfect.
- Performances sur grosses bases.
- Authentification, multi-utilisateur, persistance serveur.

## Bases de démonstration à créer
Au moins **2 fichiers SQLite** de domaines différents, 10–20 lignes par table. Suggestions :
- Une **PME** (clients, commandes, factures, produits).
- Une **association** (adhérents, cotisations, événements).
- Ou : bibliothèque, garage auto, cabinet médical.

## Livrables (PDF)
- Code source (repo Git).
- README : lancement, choix techniques/UX, démo des 2 bases, ce que tu aurais fait avec plus de temps.
