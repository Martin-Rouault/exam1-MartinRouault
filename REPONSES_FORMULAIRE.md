# Réponses au formulaire d'examen

> Les passages entre crochets `[…]` sont à compléter avec tes valeurs réelles (URL, domaine, région) avant envoi.
> Détails techniques, code avant / après et vérifications : `Changelog.md` (référencé ci-dessous par ses identifiants, ex. SEC-3).

---

## E21 — Choix de l'hébergement, analyse argumentée et préproduction

**Besoin** : une application en 5 composants (front React, API Express, gateway, 2 microservices Node) + MongoDB, conteneurisée, à mettre en ligne rapidement, avec HTTPS, deux environnements et un budget minimal.

**Solutions comparées**

| Critère | Render (PaaS) | AWS (ECS / EC2) | GCP (Cloud Run) | Scaleway |
|---|---|---|---|---|
| Mise en place | Très simple : un service par dossier du dépôt, Dockerfile détecté | Complexe (VPC, IAM, load balancer, registre) | Moyenne (registre + Cloud Run + IAM) | Moyenne |
| Déploiement d'un monorepo Docker | Natif (Root Directory / Dockerfile Path par service, Build Filters) | Pipeline à construire | Pipeline à construire | Pipeline à construire |
| HTTPS | Certificats Let's Encrypt automatiques et renouvelés, redirection HTTP→HTTPS | ACM + load balancer à configurer | Automatique | À configurer selon l'offre |
| Maintenance | Aucune infrastructure à administrer, logs et métriques intégrés | Élevée | Faible | Moyenne |
| Coût | Offre gratuite (web services + static sites) | Payant hors offre d'essai | Paiement à l'usage | Paiement à l'usage |
| Localisation / RGPD | Région Francfort disponible | Régions UE | Régions UE | Hébergeur français |

**Choix : Render + MongoDB Atlas.** Render déploie directement les Dockerfiles du dépôt, fournit HTTPS sans configuration, des Deploy Hooks pour la CI/CD et une offre gratuite adaptée à un projet de cette taille. MongoDB Atlas (cluster M0 gratuit, managé, sauvegardé, chiffré) évite d'administrer une base de données.

**Limites identifiées et réponses apportées**
- Les services gratuits s'endorment après 15 min sans trafic (≈ 1 min de réveil) → acceptable en qualification ; en production réelle, passage à une instance payante pour le backend.
- Ports SMTP 25 / 465 / 587 bloqués en sortie → relais SMTP Brevo sur le port 2525 (C-4).
- Système de fichiers éphémère → aucun fichier local : base sur Atlas, logs sur la sortie standard.

**Environnement de qualification (préproduction)**
- Même architecture que la production, déployée à partir de la branche `develop` : services Render dédiés `[noms des services préprod]`, base Atlas séparée `exam1-preprod` avec son propre utilisateur (droits `readWrite` limités à cette base), secrets différents (`JWT_SECRET`, `INTERNAL_API_KEY`).
- Déploiement automatique par la CI après tests (job `deploy-preprod`, CI-1).
- En local, `docker compose up --build` reproduit l'ensemble (6 conteneurs, D-2).
- URL préprod : `[https://preprod.ton-domaine…]`

---

## E22 — Production sécurisée et administration des services

**Architecture en production (Render, branche `main`)**
- Front : static site (CDN), URL `[https://app.ton-domaine…]` / https://exam1-martinrouault-2.onrender.com
- Backend : web service Docker, https://exam1-martinrouault-1.onrender.com
- Gateway, notifications, stock : web services Docker
- Base : MongoDB Atlas, base `exam1-prod`

**Mesures de sécurité**
- **Secrets** : uniquement dans les variables d'environnement Render (jamais dans le dépôt ni dans les images : `.gitignore` + `.dockerignore`). `JWT_SECRET` propre à la production ; le serveur refuse de démarrer s'il fait moins de 32 caractères (SEC-4).
- **Images Docker** : Node 24 Alpine, `npm ci --omit=dev`, exécution sans root, healthcheck (D-1).
- **Réseau** : CORS limité à l'URL du front (`CORS_ORIGIN`) ; microservices protégés par une clé partagée `INTERNAL_API_KEY` vérifiée à temps constant (SEC-7) ; en-têtes de sécurité Helmet (HSTS, CSP, nosniff…) ; corps de requête limité ; HTTPS forcé.
- **Base de données** : utilisateur Atlas dédié à la production avec rôle `readWrite` sur sa seule base ; liste d'accès IP `[0.0.0.0/0 — à restreindre aux plages sortantes de Render, onglet Connect ▸ Outbound]`.
- **Application** : validation Joi de toutes les entrées, prix recalculés côté serveur, limitation des tentatives de connexion (`TRUST_PROXY=1` pour lire l'IP réelle derrière le proxy Render), JWT HS256 imposé (SEC-1 à SEC-6).

**Administration**
- Variables d'environnement documentées dans `.env.example` ; déploiements tracés (onglet Events de Render + historique GitHub Actions) ; retour arrière possible depuis Render (rollback vers un déploiement précédent).
- Données initiales : `seeder.js` lancé avec l'URI Atlas de production ; compte administrateur promu via Atlas Data Explorer (`role: "admin"`).
- Santé : `GET /health` sur chaque service, utilisé par Render (Health Check Path) et par la supervision (E26).

---

## E23 — Nom de domaine, DNS et certificats HTTPS

- **Domaine réservé** : `[ton-domaine.xx]` chez `[registrar]`.
- **Enregistrements DNS** :
  | Nom | Type | Valeur | Environnement |
  |---|---|---|---|
  | `app` | CNAME | `exam1-martinrouault-2.onrender.com` | Production (front) |
  | `preprod` | CNAME | `[front-preprod].onrender.com` | Préproduction (front) |
  | `[enregistrements Brevo]` | TXT / CNAME | code de vérification, DKIM, DMARC | Authentification des emails |
- **Render** : domaines ajoutés dans Settings ▸ Custom Domains, puis « Verify ». Render émet et renouvelle automatiquement un certificat **Let's Encrypt** pour chaque domaine et redirige HTTP vers HTTPS.
- **Vérification des certificats** : cadenas du navigateur (émetteur Let's Encrypt, dates de validité) et `curl -vI https://app.[ton-domaine]` (`SSL certificate verify ok`, `HTTP/2 200`).
- **Mise à jour applicative** : `CORS_ORIGIN` du backend = `https://app.[ton-domaine],https://preprod.[ton-domaine]`.

---

## E24 — Déploiement automatisé (CI/CD) préproduction et production

Pipeline **GitHub Actions** (`.github/workflows/ci-cd.yml`, CI-1) :

1. **Installation** : `npm ci` (versions figées par `package-lock.json`) pour chaque composant.
2. **Tests** : `npm test` sur le backend (tests unitaires : validation, injection NoSQL, JWT, contrôle d'accès) ; build de production du front ; vérification de syntaxe du gateway et des microservices.
3. **Qualité / sécurité** : `npm audit` des dépendances de production ; génération de la documentation JSDoc publiée en artefact.
4. **Build et push** : construction des 5 images Docker (matrice) et publication sur GitHub Container Registry (`ghcr.io`), tag = SHA du commit + nom de branche, avec cache de build.
5. **Déploiement** :
   - branche `develop` → environnement GitHub `preproduction` → Deploy Hooks Render des services de préprod ;
   - branche `main` → environnement GitHub `production` (validation manuelle possible par un relecteur obligatoire) → Deploy Hooks de production ;
   - test de fumée sur `/health` après chaque déploiement : le job échoue si l'API ne répond pas.
6. Les pull requests exécutent toute la CI sans déployer ; l'Auto-Deploy de Render est désactivé pour que seul le pipeline déploie.

Secrets (`RENDER_DEPLOY_HOOK_*`) et variables (`BACKEND_URL`, `FRONTEND_URL`) stockés par environnement dans GitHub.

---

## E25 — Journalisation et outils d'audit

- **Winston** sur les 4 services Node (LOG-1), en remplacement de tous les `console.log` : JSON horodaté, nom du service, environnement, niveau réglable (`LOG_LEVEL`), fichiers `logs/error.log` et `logs/combined.log` en local (`LOG_TO_FILE=true`). En production, les logs vont sur la sortie standard et sont consultables dans l'onglet Logs de Render.
- **Journal des requêtes HTTP** : méthode, URL, statut, durée, IP (warn pour les 4xx, error pour les 5xx).
- **Journal d'audit** (champ `audit: true`) : connexions réussies et échouées, inscriptions, tokens refusés, accès admin refusés, création / validation / suppression de commande, changement de statut, modification de stock (avec l'auteur), appels refusés aux microservices.
- **Hygiène des logs** : suppression des fuites de secrets (tokens, mots de passe, URI MongoDB, mot de passe SMTP) (SEC-5).
- **Outils d'audit** : `npm audit` (local et dans la CI), journal des déploiements Render, historique GitHub Actions, journal d'activité MongoDB Atlas (Project Activity Feed), `Changelog.md`.

---

## E26 — Supervision et alertes (préproduction et production)

- **Outil** : `[UptimeRobot / Uptime Kuma]`.
- **Sondes HTTP(S)** toutes les `[5]` minutes, pour chaque environnement :
  - `https://[backend]/health`, `https://[gateway]/health`, `https://[notifications]/health`, `https://[stock]/health` (réponse attendue `{"status":"ok"}`) ;
  - page d'accueil du front.
- **Alertes** : email `[ton email]` en cas d'indisponibilité ; alerte d'expiration du certificat HTTPS sur les domaines personnalisés.
- **Côté plateforme** : healthcheck Render sur `/health` (un déploiement qui ne répond pas n'est pas mis en ligne), healthchecks Docker dans les images, alertes Atlas (connexions, espace disque), notifications d'échec du pipeline GitHub Actions.
- Remarque : les sondes régulières maintiennent aussi éveillés les services gratuits de Render.

---

## E27 — Bugs détectés et corrections

Méthode : relecture complète du code, test de chaque parcours (inscription, connexion, panier, commande, administration), formulaires vides, erreurs console, messages renvoyés à l'utilisateur. Détails : Changelog B-1 à B-11 et F-1 à F-8.

Principaux bugs corrigés :
- **Serveur arrêté** si MongoDB ne répond pas (handlers `async` sans `try/catch`, reproduit) (B-1).
- **Suppression de commande** sans réponse ni effet ; **validation de commande** sans écriture en base (B-2, B-3).
- **Statut de commande arbitraire** accepté : validateurs Mongoose désactivés sur les mises à jour (`runValidators`) (B-4).
- **Stock jamais décrémenté** : réservation atomique `stock ≥ quantité` avec remise en stock en cas d'échec (B-5).
- **Email de confirmation envoyé à une adresse codée en dur** au lieu du client (B-6).
- **Formulaires vides** et **nom d'utilisateur déjà pris** renvoyant des erreurs 500 ; login vide qui récupérait le premier utilisateur de la base (B-8, B-9).
- Front : livraison / paiement « fantômes » bloquant la commande, impossible de mettre un stock à 0, page admin vide sans message, mutation de l'état du panier, `key` React invalide, déconnexion incomplète (F-1 à F-8).
- Environnement : crash au démarrage sous Node 25+ (`SlowBuffer`), frontend absent du dépôt (sous-module orphelin) (ENV-1, ENV-2).

---

## E28 — Failles de sécurité et solutions

Chaque faille a été testée avant et après correction sur l'API (Changelog SEC-1 à SEC-8).

| Faille | Correction | Vérification |
|---|---|---|
| Prix et total fournis par le client | Prix lus en base, champs client ignorés | Commande à 0,01 € enregistrée à 1000 € |
| `DELETE /api/orders/:id` accessible à tout utilisateur connecté | Middleware `isAdmin` ; revue de toutes les routes PUT / DELETE | 403 pour un utilisateur |
| Injection NoSQL au login (`{"$ne": null}`), aucune validation | Schémas **Joi** sur toutes les entrées | 400 |
| Injection HTML / JS (`<script>alert('test')</script>`) | Échappement React (aucun `dangerouslySetInnerHTML`), nom alphanumérique, emails en texte brut | Rejeté à l'inscription |
| Énumération des comptes, force brute | Message unique « Identifiants incorrects », `express-rate-limit` (20 essais / 15 min) | 429 à la 21e tentative |
| JWT : algorithme non imposé, secret non contrôlé | HS256 imposé ; démarrage refusé si `JWT_SECRET` < 32 caractères ; secret différent par environnement | Token `alg: none` → 403 |
| Secrets dans les logs (token, mots de passe, URI MongoDB, mot de passe SMTP) | Logs nettoyés | Aucun secret dans les logs |
| CORS ouvert à toutes les origines | Liste blanche `CORS_ORIGIN` | Origine inconnue sans en-tête CORS |
| En-têtes HTTP, erreurs détaillées | Helmet, corps limité à 10 ko, erreurs JSON génériques | En-têtes HSTS / CSP présents |
| Microservices publics (relais d'emails abusable) | Clé interne `INTERNAL_API_KEY` | 401 sans clé |
| Dépendances vulnérables / obsolètes | `npm audit`, `jsonwebtoken` 9.0.3 `[résultat de l'audit]` | — |

Amélioration restante proposée : stocker le JWT dans un cookie `HttpOnly; Secure; SameSite` plutôt que dans le `localStorage` (nécessite que le front et l'API partagent le même domaine, cf. E23).

---

## E29 — Documentation générée et changelog

- **JSDoc** sur toutes les fonctions du backend (contrôleurs : route, paramètres, codes de réponse ; middlewares ; modèles `User`, `Product`, `Order`) ; génération HTML avec `npm run docs` (`backend/docs/`), produite automatiquement par la CI et publiée en artefact.
- **Commentaires** d'en-tête sur tous les composants et pages React.
- **README.md** : architecture, lancement local, scripts, variables, déploiement.
- **Changelog.md** structuré (format Keep a Changelog) : résumé par catégorie (Modifié, Ajouté, Sécurité, Corrigé, Identifié) et une fiche par modification (constat, code avant / après, justification, vérification).
- **Tests unitaires** documentant les règles de sécurité (`npm test`).

---

## Lien de l'application déployée

https://exam1-martinrouault-2.onrender.com `[ou https://app.ton-domaine…]`
