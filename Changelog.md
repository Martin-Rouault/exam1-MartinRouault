# Changelog

Toutes les modifications notables du projet sont consignées dans ce fichier.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Chaque entrée du résumé renvoie à une fiche détaillée (avant / après / pourquoi / vérification) plus bas.

---

## [Non publié] - 2026-11-03

### Résumé

#### Modifié — Environnement
- Passage à **Node.js 24 LTS** → [ENV-1](#env-1)
- Intégration du frontend au dépôt principal (sous-module orphelin) → [ENV-2](#env-2)

#### Ajouté — Conteneurisation (E24)
- Dockerfiles pour les 5 services, `.dockerignore`, configuration Nginx du front → [D-1](#d-1)
- `docker-compose.yml` réécrit (6 services, réseau interne, healthchecks, volume MongoDB) → [D-2](#d-2)
- Fichier `.env.example` documentant toutes les variables d'environnement → [D-3](#d-3)
- Route `/health` sur le backend, le gateway et les deux microservices → [D-4](#d-4)

#### Modifié — Configuration (préparation du déploiement)
- Ports des services lus dans la variable `PORT` (injectée par l'hébergeur) → [C-1](#c-1)
- URL de l'API du frontend configurable (`REACT_APP_API_URL`) au lieu de `localhost:5000` codé en dur → [C-2](#c-2)
- Le build de production du frontend cible l'API Render (`frontend/.env.production`) → [C-3](#c-3)

#### Ajouté — CI/CD (E24)
- Pipeline GitHub Actions : tests, audit, documentation, build et push des images, déploiement préprod / prod → [CI-1](#ci-1)

#### Ajouté — Journalisation et audit (E25)
- Winston sur les 4 services Node, journal des requêtes HTTP et journal d'audit → [LOG-1](#log-1)

#### Ajouté — Documentation et tests (E29)
- JSDoc sur le backend, génération HTML (`npm run docs`), commentaires des composants React, `README.md` → [DOC-1](#doc-1)
- Tests unitaires `node --test` (validation, JWT, contrôle d'accès) → [DOC-2](#doc-2)

#### Modifié — Emails
- Serveur SMTP configurable : relais Brevo sur le port 2525 en production, Gmail en local → [C-4](#c-4)

#### Corrigé — Gateway
- Crash au démarrage si l'URL d'un microservice n'est pas définie → [G-1](#g-1)

#### Sécurité (E28)
- Prix et total de commande recalculés côté serveur → [SEC-1](#sec-1)
- Contrôle d'accès : suppression de commande réservée aux administrateurs → [SEC-2](#sec-2)
- Validation des entrées avec Joi (dont injection NoSQL au login) → [SEC-3](#sec-3)
- Authentification : messages non discriminants, limitation des tentatives, JWT durci → [SEC-4](#sec-4)
- Secrets retirés des logs → [SEC-5](#sec-5)
- CORS restreint, en-têtes de sécurité (Helmet), corps limité, erreurs génériques → [SEC-6](#sec-6)
- Microservices protégés par une clé interne, erreurs SMTP masquées → [SEC-7](#sec-7)
- Dépendances : `jsonwebtoken` 9.0.3, compatible Node 25+ → [SEC-8](#sec-8)

#### Corrigé — Backend (E27)
- Crash du serveur quand MongoDB est indisponible → [B-1](#b-1)
- `DELETE /api/orders/:id` ne répondait jamais et ne supprimait rien → [B-2](#b-2)
- `PUT /api/orders/:id/validate` ne modifiait rien en base → [B-3](#b-3)
- Statut de commande arbitraire accepté (enum ignoré) → [B-4](#b-4)
- Stock jamais décrémenté lors d'une commande → [B-5](#b-5)
- Notification de commande envoyée à une adresse codée en dur → [B-6](#b-6)
- Données de commande non contrôlées → [B-7](#b-7)
- Inscription : nom d'utilisateur déjà pris → erreur 500 → [B-8](#b-8)
- Formulaires de connexion / inscription vides → erreur 500 → [B-9](#b-9)
- Mise à jour du stock : valeur absente ou non numérique → erreur 500 → [B-10](#b-10)
- Nettoyage annexe de `orderController.js` → [B-11](#b-11)

#### Corrigé — Frontend (E27)
- Méthodes de livraison / paiement « fantômes » → [F-1](#f-1)
- Mutation directe de l'état du panier → [F-2](#f-2)
- Admin : impossible de mettre un stock à 0 → [F-3](#f-3)
- Admin : page vide sans message si le chargement échoue → [F-4](#f-4)
- Commande : message d'erreur générique → [F-5](#f-5)
- Liste des produits : `key` React invalide → [F-6](#f-6)
- Déconnexion incomplète (rôle conservé) → [F-7](#f-7)
- Formulaires connexion / inscription envoyables vides → [F-8](#f-8)

#### Identifié, conservé
- `backend/routes/adminRoutes.js` et `backend/controllers/adminController.js` : code jamais branché → [S-1](#s-1)
- `gateway/routes/notif.js` : fichier vide → [S-2](#s-2)

#### Non modifié volontairement
- Appel à `services/emailService` laissé commenté → [N-1](#n-1)

---

## Détail des modifications

### Environnement

<a id="env-1"></a>
#### ENV-1 — Passage à Node.js 24 LTS
- **Constat** : le backend plantait au démarrage sous Node 26 :
  `TypeError: Cannot read properties of undefined (reading 'prototype')` dans `buffer-equal-constant-time/index.js:37`.
- **Cause** : Node 25 a supprimé l'API dépréciée `buffer.SlowBuffer`. `jsonwebtoken@9.0.2` dépend de `jws@3` → `jwa@1.4.1` → `buffer-equal-constant-time@1.0.1`, qui lit `SlowBuffer.prototype` dès son chargement.
- **Correction** : utilisation de Node 24 LTS (`nvm install 24 && nvm use 24`). Aucun fichier du projet modifié.
- **Historique** : un correctif temporaire (fichier `backend/slowbuffer-shim.js` + `require` en tête de `server.js`) a été ajouté puis retiré ; `server.js` est revenu à son état d'origine.
- **À faire (E28)** : mettre à jour la chaîne JWT pour rendre le backend compatible avec Node 25+.

<a id="env-2"></a>
#### ENV-2 — Intégration du frontend au dépôt principal
- **Constat** : `frontend/` contenait son propre dépôt Git (`frontend/.git`, 2 commits : initialisation Create React App et « front »). Le dépôt principal l'enregistrait comme un sous-module (entrée Git de mode `160000`) sans fichier `.gitmodules`.
- **Conséquence** : sur GitHub, le dossier `frontend` apparaissait vide. Le code du front était absent pour tout clone du dépôt (CI/CD, hébergeur, correcteur), et les modifications du front n'étaient pas suivies par le dépôt principal.
- **Correction** :
  ```bash
  rm -rf frontend/.git
  git rm --cached frontend
  git add frontend
  git commit -m "fix: intègre le frontend au repo principal (sous-module orphelin)"
  ```
- **Résultat** : les 37 fichiers du frontend sont suivis par le dépôt principal (`node_modules` exclu par `.gitignore`). Seul l'historique des 2 commits du sous-dépôt est perdu, le code est intact.

### Conteneurisation (E24)

<a id="d-1"></a>
#### D-1 — Dockerfiles
- **Fichiers créés** : `backend/Dockerfile`, `gateway/Dockerfile`, `microservices/notifications/Dockerfile`, `microservices/stock-management/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, un `.dockerignore` par service.
- **Avant** : aucun Dockerfile, alors que l'ancien `docker-compose.yml` faisait `build: ./backend`, `build: ./frontend`… (`docker compose up` échouait dès le build).
- **Services Node (backend, gateway, microservices)** :
  - image `node:24-alpine` (légère ; Node 24 imposé par [ENV-1](#env-1)) ;
  - `npm ci --omit=dev` : installation reproductible depuis `package-lock.json`, sans dépendances de développement ;
  - `package*.json` copiés avant le code : la couche des dépendances reste en cache tant qu'elles ne changent pas ;
  - exécution avec l'utilisateur non-root `node` ;
  - `HEALTHCHECK` sur `/health` ([D-4](#d-4)).
- **Frontend** : build multi-étapes. Étape 1 : `node:24-alpine` construit l'application React avec l'URL d'API passée en argument de build ([C-2](#c-2)). Étape 2 : seuls les fichiers statiques sont copiés dans `nginx:stable-alpine` (image finale sans Node ni code source). `nginx.conf` renvoie `index.html` pour toutes les routes (application monopage : `/cart`, `/admin`… fonctionnent au rechargement), met en cache long les fichiers versionnés de `/static/` et masque la version de Nginx.
- **`.dockerignore`** : exclut `node_modules`, `.env` (aucun secret copié dans les images), logs et `.git`.

<a id="d-2"></a>
#### D-2 — `docker-compose.yml`
- **Avant** : services `frontend`, `backend`, `mongo`, `notifications`, `stock-management` ; ports publiés `3001`/`3002` alors que les services écoutent sur `4002`/`4003` ; gateway absent ; clé `version` obsolète (avertissement de Docker Compose).
- **Après** :
  | Service | Port publié | Rôle |
  |---|---|---|
  | `mongo` (image `mongo:8`) | `127.0.0.1:27018` | Base de données, volume persistant `mongo-data`, healthcheck `mongosh ping` |
  | `backend` | `5000` | API, démarre une fois MongoDB opérationnel (`condition: service_healthy`) |
  | `gateway` | aucun | Point d'entrée des microservices, joignable uniquement sur le réseau Docker interne |
  | `notifications` | aucun | Envoi des emails |
  | `stock-management` | aucun | Gestion du stock |
  | `frontend` | `3000` | Nginx servant l'application React |
- **Choix de sécurité** : seuls le front et l'API sont publiés. Le gateway et les microservices ne sont accessibles que par le backend via le réseau interne. MongoDB n'est publié que sur `127.0.0.1` (accès Compass local).
- **Secrets** : `JWT_SECRET`, `EMAIL_USER`, `EMAIL_APPLICATION_PASSWORD` sont lus dans le `.env` racine par interpolation (`${...}`). Chaque conteneur ne reçoit que les variables dont il a besoin. Le lancement échoue explicitement si `JWT_SECRET` est absent.
- **Usage** : `docker compose up --build`, puis `docker compose exec backend node seeder.js` pour insérer les produits de démonstration.

<a id="d-3"></a>
#### D-3 — `.env.example`
- Liste commentée de toutes les variables (backend, gateway, notifications, frontend), sans valeur secrète. Le fichier est versionné (exception `!.env.example` déjà présente dans `.gitignore`) ; le vrai `.env` reste ignoré.

<a id="d-4"></a>
#### D-4 — Route `/health`
- **Fichiers** : `backend/server.js`, `gateway/server.js`, `microservices/notifications/index.js`, `microservices/stock-management/index.js`
- **Après** : `GET /health` → `{"status":"ok","service":"<nom>"}`
- **Pourquoi** : utilisée par les `HEALTHCHECK` Docker, le health check de l'hébergeur et l'outil de supervision (E26).
- **Vérification** : `/health` répond sur les 4 services ; un `POST /update-stock` envoyé au gateway est bien relayé au microservice de stock.

### Configuration

<a id="c-1"></a>
#### C-1 — Ports lus dans `PORT`
- **Avant** : gateway `GATEWAY_PORT || 8000`, notifications `NOTIFI_PORT || 4002`, stock `4003` **codé en dur**.
- **Après** : `process.env.PORT` en priorité, puis l'ancienne variable, puis la valeur par défaut (comportement local inchangé).
- **Pourquoi** : les hébergeurs PaaS (Render…) attribuent le port d'écoute via la variable `PORT`.

<a id="c-2"></a>
#### C-2 — URL de l'API du frontend configurable
- **Fichiers** : nouveau `frontend/src/config.js` ; `services/api.js`, `services/adminApi.js`, `pages/Login.js`, `pages/Register.js` l'importent.
- **Avant** : `http://localhost:5000/api` écrit en dur à 4 endroits ; le front déployé aurait appelé le `localhost` du visiteur.
- **Après** :
  ```js
  export const API_BASE_URL =
    process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  ```
- **À savoir** : Create React App intègre `REACT_APP_*` au moment du build. La préprod et la prod nécessitent donc chacune leur propre build.
- **Vérification** : build avec `REACT_APP_API_URL=https://api.example.test/api` → l'URL est bien présente dans le bundle généré.

<a id="c-3"></a>
#### C-3 — Build de production du frontend pointant sur l'API Render
- **Constat** : le front déployé appelait `http://localhost:5000/api`. Le `Dockerfile` du front définissait `ARG REACT_APP_API_URL=http://localhost:5000/api` puis `ENV REACT_APP_API_URL=...`. Sans argument de build, l'URL locale était donc toujours injectée.
- **Corrections** :
  - nouveau fichier `frontend/.env.production`, lu automatiquement par `npm run build` :
    ```
    REACT_APP_API_URL=https://exam1-martinrouault-1.onrender.com/api
    ```
  - `.gitignore` : exception `!frontend/.env.production`, nécessaire car la règle `*.env*` l'aurait exclu du dépôt (et donc de Render). Le fichier ne contient qu'une URL publique, déjà visible dans le bundle JavaScript ;
  - `frontend/Dockerfile` : `ARG REACT_APP_API_URL` sans valeur par défaut et sans `ENV`. Sans argument, c'est `.env.production` qui s'applique ; avec un argument (`docker-compose.yml` passe `http://localhost:5000/api`), l'argument est prioritaire.
- **Ordre de priorité** (Create React App) : variable d'environnement déjà définie > `.env.production` > valeur par défaut de `src/config.js`. En développement (`npm start`), `.env.production` n'est pas lu et le front reste sur `localhost:5000`.
- **Vérification** : build de production → le bundle contient `exam1-martinrouault-1.onrender.com/api` et plus aucune occurrence de `localhost:5000`.

<a id="c-4"></a>
#### C-4 — Serveur SMTP configurable
- **Constat** : le microservice de notifications envoyait via Gmail (`service: 'gmail'`, ports 465 / 587). Render bloque en offre gratuite le trafic sortant sur les ports 25, 465 et 587 : aucun email ne pouvait partir de la production.
- **Correction** (`microservices/notifications/index.js`, fonction `createTransporter`) :
  - si `SMTP_HOST` est défini : serveur SMTP générique (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`). En production : relais Brevo `smtp-relay.brevo.com`, port **2525** (port alternatif proposé par Brevo, non bloqué par Render) ;
  - sinon : Gmail avec mot de passe d'application, comme à l'origine (local, Docker Compose) ;
  - expéditeur configurable avec `EMAIL_FROM` (adresse validée chez le fournisseur).
- Variables ajoutées à `.env.example` et transmises par `docker-compose.yml`.

<a id="g-1"></a>
#### G-1 — Gateway : crash si un microservice n'est pas configuré
- **Constat** (déploiement Render) : `AssertionError [ERR_ASSERTION]: Host should not be empty` dans `routes/notifi.js`. `express-http-proxy` refuse une URL vide : sans `NOTIFI_SERVICE_URL` ou `STOCK_SERVICE_URL`, le gateway entier s'arrêtait au démarrage.
- **Correction** (`gateway/routes/notifi.js`, `gateway/routes/stock.js`) : si la variable est absente, le gateway démarre quand même ; seule la route concernée répond 503 « Service … non configuré » (avertissement dans les logs). Si le microservice est configuré mais injoignable, réponse 502 au lieu d'une erreur non gérée (`proxyErrorHandler`), avec un log d'erreur.
- **Vérification** : gateway lancé sans aucune variable → `/health` 200, `/notify` 503 ; microservice arrêté → `/update-stock` 502.

### CI/CD (E24)

<a id="ci-1"></a>
#### CI-1 — Pipeline GitHub Actions (`.github/workflows/ci-cd.yml`)
| Job | Déclencheur | Étapes |
|---|---|---|
| `backend` | push / pull request sur `main` et `develop` | `npm ci` → `npm test` → `npm audit --audit-level=high` (non bloquant) → `npm run docs` → documentation publiée en artefact |
| `frontend` | idem | `npm ci` → build de production |
| `services` | idem (matrice : gateway, notifications, stock) | `npm ci` → vérification de syntaxe |
| `docker` | après les 3 jobs précédents | build des 5 images ; sur push : envoi vers `ghcr.io` (tags SHA du commit + nom de branche), cache de build GitHub Actions |
| `deploy-preprod` | push sur `develop` | environnement GitHub `preproduction` : appel des Deploy Hooks Render, puis test de fumée sur `/health` |
| `deploy-prod` | push sur `main` | environnement GitHub `production` (validation manuelle possible via « Required reviewers ») : Deploy Hooks + test de fumée |
- Les pull requests exécutent la CI sans jamais déployer.
- Les noms d'images sont construits avec le propriétaire du dépôt converti en minuscules (`${GITHUB_REPOSITORY_OWNER,,}`) : les registres Docker refusent les majuscules (`Martin-Rouault` → `martin-rouault`).
- Scripts : `.github/scripts/render-deploy.sh` (les URL des hooks sont des secrets, jamais affichées) et `.github/scripts/smoke-test.sh` (attente du build Render et du réveil d'un service gratuit, 20 tentatives).
- Configuration requise : secrets `RENDER_DEPLOY_HOOK_*` et variables `BACKEND_URL` / `FRONTEND_URL` dans chaque environnement GitHub ; Auto-Deploy désactivé sur Render.

### Journalisation (E25)

<a id="log-1"></a>
#### LOG-1 — Winston et journal d'audit
- **Fichiers** : `backend/config/logger.js`, `gateway/logger.js`, `microservices/notifications/logger.js`, `microservices/stock-management/logger.js`.
- **Format** : JSON horodaté avec le nom du service et l'environnement, sur la sortie standard (collectée par Docker et par l'onglet Logs de Render). `LOG_TO_FILE=true` ajoute `logs/error.log` et `logs/combined.log` en local. Niveau réglable avec `LOG_LEVEL` (défaut `http`).
- **Journal des requêtes** : middleware `httpLogger` sur les 4 services (méthode, URL sans paramètres, statut, durée, IP). Niveau `warn` pour les 4xx, `error` pour les 5xx. Ni en-têtes ni corps (ils peuvent contenir des secrets).
- **Journal d'audit** (champ `audit: true`, filtrable) :
  - connexion réussie / échouée (avec IP), inscription ;
  - token refusé, accès administrateur refusé ;
  - commande créée, validée, statut modifié, supprimée (avec l'auteur) ;
  - stock modifié (avec l'auteur) ;
  - appels refusés aux microservices (clé interne invalide).
- Tous les `console.log` / `console.error` des services sont remplacés (hors script `seeder.js`, utilitaire en ligne de commande).

### Documentation et tests (E29)

<a id="doc-1"></a>
#### DOC-1 — JSDoc et documentation générée
- Commentaires JSDoc sur tous les contrôleurs (route, paramètres, codes de réponse), les middlewares, le logger, la connexion MongoDB et les modèles (`@typedef User`, `Product`, `Order`, `OrderItem`).
- `backend/jsdoc.json` + script `npm run docs` → site HTML dans `backend/docs/` (ignoré par Git, publié comme artefact par la CI).
- Commentaires d'en-tête sur tous les composants et pages React (rôle, données manipulées, règles métier).
- `README.md` à la racine : architecture, lancement local (Docker ou non), scripts, variables, déploiement.
- Scripts backend : `npm start` lance désormais `node server.js` (production) ; le rechargement automatique passe par `npm run dev` (nodemon).

<a id="doc-2"></a>
#### DOC-2 — Tests unitaires
- **Résultat** : 10 tests, 10 réussis.
- `backend/tests/validation.test.js`, exécuté par `npm test` (runner natif `node:test`, sans dépendance supplémentaire ni base de données).
- Couvre : injection NoSQL au login, mot de passe trop court, nom contenant du HTML / JavaScript, suppression du prix envoyé par le client, quantité et paiement invalides, enum des statuts, stock à 0, middleware `validate`, token absent ou `alg: none`, contrôle `isAdmin`.

### Sécurité (E28)

Toutes les vérifications ci-dessous ont été exécutées sur l'API réelle (`server.js` complet, base simulée).

<a id="sec-1"></a>
#### SEC-1 — Prix falsifiables
- **Faille** : `createOrder` calculait le total à partir du `price` envoyé par le navigateur. En modifiant la requête, on pouvait commander un ordinateur à 0,01 €.
- **Correction** : le prix est lu en base, dans le document renvoyé par le décrément atomique du stock (`updated.price`). Les champs `price` et `total` envoyés par le client sont supprimés par la validation Joi (`stripUnknown`).
- **Vérification** : commande envoyée avec `price: 0.01` → commande enregistrée avec un total de 1000 €.

<a id="sec-2"></a>
#### SEC-2 — Contrôle d'accès sur `DELETE /api/orders/:id`
- **Faille** : la route n'exigeait qu'un utilisateur connecté (`isAdmin` absent, contrairement au commentaire).
- **Correction** : ajout de `isAdmin`. Revue des autres routes `PUT` / `DELETE` : toutes protégées par `authenticateToken` + `isAdmin`.
- **Vérification** : suppression par un utilisateur non admin → 403.

<a id="sec-3"></a>
#### SEC-3 — Validation des entrées (Joi)
- **Fichiers** : `middlewares/validate.js` (middleware générique), `validators/schemas.js` (schémas), appliqués dans `routes/*.js`.
- **Règles** :
  - inscription : nom alphanumérique de 3 à 30 caractères, email valide, mot de passe de 8 à 128 caractères ;
  - commande : identifiants MongoDB valides, quantités entières de 1 à 100, adresse bornée, paiement et livraison limités aux valeurs de l'enum ;
  - statut et stock : valeurs autorisées uniquement ;
  - identifiants dans l'URL : ObjectId valides.
- **Injection NoSQL** : `{"username": {"$ne": null}}` était transmis tel quel à `User.findOne`, qui renvoyait alors le premier utilisateur de la base. Joi impose désormais des chaînes de caractères. **Vérification** : 400 « Le nom d'utilisateur doit être une chaîne de caractères ».
- **XSS (`<script>alert('test')</script>`)** : React échappe tout le contenu affiché et aucun `dangerouslySetInnerHTML` n'est utilisé (vérifié). Le nom d'utilisateur est en plus limité aux caractères alphanumériques et les emails sont envoyés en texte brut.

<a id="sec-4"></a>
#### SEC-4 — Authentification
- **Énumération des comptes** : « Utilisateur non trouvé » et « Mot de passe incorrect » permettaient de savoir si un compte existait. La réponse est maintenant toujours 401 « Identifiants incorrects. ». **Vérification** : réponse identique pour un compte inexistant et pour un mauvais mot de passe.
- **Force brute** : `express-rate-limit` sur `/api/auth/login` et `/api/auth/register` (20 requêtes par IP et par tranche de 15 minutes). `TRUST_PROXY=1` en production pour identifier l'IP réelle derrière le proxy Render. **Vérification** : la 21e requête reçoit 429.
- **JWT** :
  - algorithme `HS256` imposé à la signature et à la vérification. **Vérification** : un token `"alg": "none"` se présentant comme admin → 403 ;
  - le serveur refuse de démarrer si `JWT_SECRET` est absent ou fait moins de 32 caractères. Le secret local (64 caractères hexadécimaux, 256 bits) est conforme ; un secret différent est utilisé en production.
- **Reste à faire** : le token est stocké dans le `localStorage`. Le passage à un cookie `HttpOnly` nécessite que le front et l'API partagent un même domaine (sous-domaines `app.` / `api.`), ce qui dépend de E23.

<a id="sec-5"></a>
#### SEC-5 — Secrets dans les logs
Supprimés :
- `authMiddleware` : le token de chaque requête ;
- `authController` : mot de passe en clair, document utilisateur complet (avec le hash), token ;
- `config/db.js` : l'URI MongoDB, qui contient l'identifiant et le mot de passe Atlas ;
- microservice notifications : l'adresse et le **mot de passe SMTP** affichés au démarrage, le contenu des emails ;
- `frontend/src/services/api.js` : le token et la commande affichés dans la console du navigateur.

Les options obsolètes `useNewUrlParser` / `useUnifiedTopology` ont aussi été retirées. **Vérification** : aucun token ni mot de passe dans les logs après une série de connexions et de commandes.

<a id="sec-6"></a>
#### SEC-6 — Configuration HTTP de l'API
- **CORS** : `cors()` autorisait toutes les origines. La liste des origines autorisées est maintenant lue dans `CORS_ORIGIN`. **Vérification** : une origine autorisée reçoit `Access-Control-Allow-Origin`, une origine inconnue non.
- **Helmet** : en-têtes `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`… ; suppression de `X-Powered-By` (également désactivé sur le gateway).
- **Corps de requête** limité à 10 ko (413 au-delà).
- **Gestionnaire d'erreurs** : réponse JSON générique, jamais de pile d'appels. **Vérification** : un JSON malformé renvoie 400 « Corps de requête JSON invalide. ».

<a id="sec-7"></a>
#### SEC-7 — Microservices
- **Faille** : sur Render, chaque service a une URL publique. Sans authentification, n'importe qui pouvait appeler `/notify` et envoyer des emails avec le compte de l'application (relais de spam).
- **Correction** : clé partagée `INTERNAL_API_KEY`, transmise par le backend dans l'en-tête `x-internal-token` et vérifiée par notifications et stock-management avec une comparaison à temps constant (`crypto.timingSafeEqual`). Sans clé configurée, toutes les requêtes sont refusées (401).
- **Notifications** : validation de `to`, `subject` et `text` ; l'erreur Nodemailer complète n'est plus renvoyée au client (502 générique) ; `body-parser` remplacé par `express.json` avec une limite de taille.

<a id="sec-8"></a>
#### SEC-8 — Dépendances
- `jsonwebtoken` 9.0.2 → 9.0.3 (`jws` 4 / `jwa` 2.0.1) : `jwa` utilise désormais `crypto.timingSafeEqual` et ne charge plus `buffer-equal-constant-time` au démarrage. **Vérification** : signature et vérification d'un JWT avec `SlowBuffer` supprimé (comportement de Node 25+) → OK. Le problème [ENV-1](#env-1) est donc corrigé dans le code.
- Ajouts : `joi`, `helmet`, `express-rate-limit`.
- `npm audit` : à compléter (le build Render signalait 10 vulnérabilités dans le backend avant mise à jour).

### Backend

<a id="b-1"></a>
#### B-1 — Crash du serveur quand MongoDB est indisponible
- **Fichiers** : `backend/controllers/productController.js` (`getProducts`), `backend/controllers/orderController.js` (`getOrders`)
- **Avant** :
  ```js
  exports.getProducts = async (req, res) => {
      const products = await Product.find();
      res.json(products);
  };
  ```
- **Après** :
  ```js
  exports.getProducts = async (req, res) => {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (error) {
      console.error('Erreur lors de la récupération des produits :', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des produits.' });
    }
  };
  ```
  (même correction pour `getOrders`)
- **Pourquoi** : Express 4 ne capture pas les erreurs des handlers `async`. Une requête MongoDB en échec produit un rejet de promesse non géré, et Node (≥ 15) arrête alors tout le processus.
- **Vérification** : reproduit avant correction — `GET /api/products` sans MongoDB → `MongooseError: Operation products.find() buffering timed out` → processus arrêté (code 1).

<a id="b-2"></a>
#### B-2 — `DELETE /api/orders/:id` ne répondait jamais
- **Fichier** : `backend/controllers/orderController.js` (`deleteOrder`)
- **Avant** :
  ```js
  exports.deleteOrder = async(req, res)=>{
      const { orderId } = req.body;
      console.log(`orderId to delete is ${orderId}`)
  }
  ```
- **Après** : `Order.findByIdAndDelete(req.params.id)` dans un `try/catch`. Réponses : 200 (supprimée), 404 (introuvable), 400 (identifiant invalide), 500 (erreur serveur).
- **Pourquoi** : la route déclare `/:id` mais le handler lisait le body, ne supprimait rien et n'envoyait aucune réponse : la requête restait pendante jusqu'au timeout du client.
- **Reste à faire (E28)** : la route n'est pas réservée aux administrateurs (`isAdmin` absent alors que le commentaire l'indique).

<a id="b-3"></a>
#### B-3 — `PUT /api/orders/:id/validate` ne modifiait rien
- **Fichier** : `backend/controllers/orderController.js` (`validateOrder`)
- **Avant** :
  ```js
  exports.validateOrder = async (req, res) => {
    const { orderId } = req.body;
    res.status(200).json({message: `Commande ${orderId} validée avec succès.`})
  }
  ```
- **Après** : `Order.findByIdAndUpdate(req.params.id, { status: 'En cours de traitement' }, { new: true, runValidators: true })`, réponses 200 / 404 / 400 / 500.
- **Pourquoi** : la réponse annonçait une validation sans aucune écriture en base, et l'identifiant était lu au mauvais endroit. Le statut « En cours de traitement » est celui qu'utilise déjà le bouton « Valider la commande » de l'interface admin.

<a id="b-4"></a>
#### B-4 — Statut de commande arbitraire accepté
- **Fichier** : `backend/controllers/orderController.js` (`updateOrderStatus`)
- **Avant** :
  ```js
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status, updatedAt: new Date() },
    { new: true }
  );
  ```
- **Après** :
  ```js
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status },
    { new: true, runValidators: true }
  );
  ```
  et gestion de `ValidationError` (400 avec la liste des statuts autorisés) et `CastError` (400, identifiant invalide).
- **Pourquoi** : Mongoose n'applique pas les validateurs du schéma sur les requêtes de mise à jour par défaut. L'enum `['En attente', 'En cours de traitement', 'Expédiée', 'Délivrée', 'Annulée']` était donc ignoré et n'importe quelle chaîne était enregistrée.
- **Vérification** : `findByIdAndUpdate(id, { status: 'Hacked' })` → requête envoyée sans validation ; avec `runValidators: true` → `ValidationError`.
- `updatedAt: new Date()` retiré : le schéma utilise `timestamps: true`, Mongoose met déjà ce champ à jour.

<a id="b-5"></a>
#### B-5 — Stock jamais décrémenté lors d'une commande
- **Fichier** : `backend/controllers/orderController.js` (`createOrder`)
- **Avant** : l'appel au microservice de stock était commenté, et ce microservice (`microservices/stock-management`) se contente d'un `console.log` sans accès à la base. Le stock affiché en admin ne baissait jamais et une commande pouvait dépasser le stock disponible.
- **Après** : pour chaque article, décrément atomique conditionnel :
  ```js
  const updated = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
  ```
  Si un article n'a pas assez de stock (409 « Stock insuffisant pour … ») ou si l'enregistrement de la commande échoue, les quantités déjà décrémentées sont remises en stock (fonction `rollbackStock`).
- **Pourquoi conditionnel et atomique** : la condition `stock >= quantité` et le décrément s'exécutent en une seule opération MongoDB, ce qui évite qu'on passe sous zéro quand deux commandes sont passées en même temps.
- **Choix d'architecture** : la gestion est faite dans le backend car le microservice de stock n'a pas d'accès à la base. La décentraliser dans ce service est une évolution possible.
- **Vérification (modèles simulés)** : stock insuffisant → 409 et stock du premier article restauré ; mode de paiement invalide → 400 et stock restauré ; commande valide → 201 et stock décrémenté.

<a id="b-6"></a>
#### B-6 — Notification de commande envoyée à une adresse codée en dur
- **Fichier** : `backend/controllers/orderController.js` (`createOrder`)
- **Avant** :
  ```js
  await axios.post('http://localhost:8000/notify', {
    to: 'syaob@yahoo.fr',
    ...
  ```
- **Après** : l'email est récupéré via `User.findById(userId).select('email')` et la notification est envoyée au client. L'URL du gateway est lue dans `GATEWAY_URL` (valeur par défaut `http://localhost:8000`, comportement inchangé en local).
- **Pourquoi** : tous les emails de confirmation partaient vers la même adresse. L'URL configurable est nécessaire pour le déploiement.
- La notification reste non bloquante : si elle échoue, la commande est quand même enregistrée et confirmée.

<a id="b-7"></a>
#### B-7 — Données de commande non contrôlées
- **Fichier** : `backend/controllers/orderController.js` (`createOrder`)
- **Avant** : seul le fait que `items` soit un tableau non vide était vérifié. Un identifiant de produit invalide ou une quantité de 0, négative ou décimale produisait une erreur 500 ou une commande incohérente. Une adresse, un mode de paiement ou de livraison invalide renvoyait une erreur 500.
- **Après** :
  - 400 si un `productId` n'est pas un ObjectId valide ou si une quantité n'est pas un entier ≥ 1 ;
  - 400 avec un message explicite en cas d'erreur de validation Mongoose (adresse, paiement, livraison).
- **Reste à faire (E28)** : le prix unitaire et le total sont encore calculés à partir des prix envoyés par le client.

<a id="b-8"></a>
#### B-8 — Inscription : nom d'utilisateur déjà pris → erreur 500
- **Fichier** : `backend/controllers/authController.js` (`register`)
- **Avant** :
  ```js
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
  }
  ```
- **Après** :
  ```js
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    const message = existingUser.email === email
      ? 'Cet email est déjà utilisé.'
      : 'Ce nom d\'utilisateur est déjà utilisé.';
    return res.status(409).json({ message });
  }
  ```
  et dans le `catch` : `error.code === 11000` → 409 (cas de deux inscriptions simultanées).
- **Pourquoi** : `username` est unique dans le modèle `User` mais seul l'email était vérifié. Un nom déjà pris déclenchait l'erreur MongoDB E11000, renvoyée en 500 « Une erreur est survenue ». Le code 409 (Conflict) est plus juste que 400 pour un doublon.
- **Vérification** : nom pris → 409, email pris → 409, inscription valide → 201.

<a id="b-9"></a>
#### B-9 — Formulaires de connexion / inscription vides → erreur 500
- **Fichier** : `backend/controllers/authController.js` (`login`, `register`)
- **Après** :
  ```js
  // login
  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }
  // register
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
  }
  ```
- **Pourquoi** :
  - connexion : Mongoose retire les valeurs `undefined` du filtre, donc `findOne({ username: undefined })` devient `findOne({})` et renvoie le **premier utilisateur de la base**. `bcrypt.compare(undefined, hash)` lève ensuite une exception → 500 ;
  - inscription : la validation Mongoose échoue → 500 « Une erreur est survenue ».
- **Vérification** : connexion vide → 400 ; inscription incomplète → 400.

<a id="b-10"></a>
#### B-10 — Mise à jour du stock : valeur absente ou non numérique → erreur 500
- **Fichier** : `backend/controllers/productController.js` (`updateProductStock`)
- **Avant** :
  ```js
  const { stock } = req.body;
  if (stock < 0) { ... 400 ... }
  ```
- **Après** :
  ```js
  const stock = Number(req.body.stock);
  if (req.body.stock === undefined || req.body.stock === '' || !Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ message: 'Le stock doit être un nombre entier positif ou nul.' });
  }
  ```
  et `CastError` → 400 (identifiant de produit invalide).
- **Pourquoi** : `undefined < 0` et `"abc" < 0` valent `false`, ces valeurs passaient donc le contrôle puis faisaient échouer l'enregistrement (500).
- `product.updatedAt = Date.now()` retiré : géré par `timestamps: true`.

<a id="b-11"></a>
#### B-11 — Nettoyage annexe de `orderController.js`
Effectué lors de la réécriture du fichier pour B-2 à B-7, sans changement de comportement :
- suppression de l'ancienne version de `createOrder` entièrement commentée (≈ 50 lignes) et des valeurs d'adresse / paiement de test commentées ;
- suppression de `console.log` de débogage :
  - `user is in createOrder …` ;
  - `items are ${JSON.stringify(req.body)}`, qui écrivait dans les logs toute la commande, adresse du client comprise ;
  - le log par article ;
  - `orderId to delete is …` ;
  - `dump console log order id …` ;
- le log `Commande sauvegardée` n'affiche plus que l'identifiant de la commande au lieu du document complet ;
- ajout des imports nécessaires : `mongoose`, `Product`, `User`.

### Frontend

<a id="f-1"></a>
#### F-1 — Méthodes de livraison / paiement « fantômes »
- **Fichier** : `frontend/src/context/CartContext.js`
- **Avant** : `shippingMethod: null, paymentMethod: null`
- **Après** : `shippingMethod: "colissimo", paymentMethod: "Carte bancaire"`
- **Pourquoi** : les `<select>` affichaient la première option (Colissimo / Carte bancaire) alors que la valeur réelle dans le contexte était `null`. Sans changement manuel, la synthèse affichait « Non spécifiée » et la commande était refusée (« méthode de livraison manquante »).

<a id="f-2"></a>
#### F-2 — Mutation directe de l'état du panier
- **Fichier** : `frontend/src/context/CartContext.js` (action `ADD_TO_CART`)
- **Avant** :
  ```js
  const updatedCart = [...state.cart];
  updatedCart[existingProductIndex].quantity += action.payload.quantity || 1;
  ```
- **Après** :
  ```js
  const updatedCart = state.cart.map((item, index) =>
    index === existingProductIndex
      ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
      : item
  );
  ```
- **Pourquoi** : `[...state.cart]` copie le tableau mais pas les objets. La quantité était modifiée sur l'objet de l'état précédent, ce qui viole le principe d'immutabilité des reducers React et peut provoquer des rendus incohérents (double incrément en mode StrictMode).

<a id="f-3"></a>
#### F-3 — Admin : impossible de mettre un stock à 0
- **Fichier** : `frontend/src/pages/Admin.js` (`handleStockUpdate`)
- **Avant** :
  ```js
  const stockValue = newStock[productId];
  if (!stockValue || stockValue < 0) { alert(...); return; }
  ```
- **Après** :
  ```js
  const rawValue = newStock[productId];
  const stockValue = Number(rawValue);
  if (rawValue === undefined || rawValue === "" || !Number.isInteger(stockValue) || stockValue < 0) { ... }
  ```
  Le stock est envoyé à l'API sous forme de nombre, et le message d'erreur renvoyé par le serveur est affiché.
- **Pourquoi** : `!0` vaut `true`, donc la valeur 0 (rupture de stock) était refusée. La valeur était aussi envoyée sous forme de chaîne.

<a id="f-4"></a>
#### F-4 — Admin : page vide sans message si le chargement échoue
- **Fichier** : `frontend/src/pages/Admin.js` (`useEffect` / `fetchData`)
- **Avant** : deux `await` sans `try/catch`.
- **Après** : chargement en parallèle (`Promise.all`) dans un `try/catch`. En cas d'erreur, un message s'affiche : « Session expirée ou accès refusé » (401/403) ou « Impossible de charger les données ».
- **Pourquoi** : avec un token expiré (validité 1 h), l'erreur n'était pas gérée et la page restait vide, sans explication.

<a id="f-5"></a>
#### F-5 — Commande : message d'erreur générique
- **Fichier** : `frontend/src/pages/Order.js`
- **Après** : `alert(error.response?.data?.message || "Une erreur technique est survenue. Veuillez réessayer.")`
- **Pourquoi** : les messages du serveur (stock insuffisant, données invalides…) étaient remplacés par un message générique ; l'utilisateur ne savait pas quoi corriger.

<a id="f-6"></a>
#### F-6 — Liste des produits : `key` React invalide
- **Fichier** : `frontend/src/pages/ProductList.js`
- **Avant** : `<li key={product.id} …>` — **Après** : `<li key={product._id} …>`
- **Pourquoi** : MongoDB expose `_id`, donc `product.id` valait `undefined`. React affichait un avertissement et ne pouvait pas suivre correctement les éléments de la liste.

<a id="f-7"></a>
#### F-7 — Déconnexion incomplète
- **Fichier** : `frontend/src/components/Navbar.js` (`handleLogout`)
- **Après** : ajout de `localStorage.removeItem('role');`
- **Pourquoi** : le rôle restait stocké après la déconnexion.

<a id="f-8"></a>
#### F-8 — Formulaires connexion / inscription envoyables vides
- **Fichiers** : `frontend/src/pages/Login.js`, `frontend/src/pages/Register.js`
- **Après** : attribut `required` sur tous les champs.
- **Pourquoi** : le navigateur bloque l'envoi d'un formulaire vide. Le contrôle serveur [B-9](#b-9) reste la vraie protection, car un appel direct à l'API contourne le formulaire.
- **Vérification** : le build de production (`react-scripts build`) compile sans erreur.

### Identifié, conservé

Ces fichiers ont été supprimés puis restaurés : ils sont conservés en l'état et documentés ici comme dette technique.

<a id="s-1"></a>
#### S-1 — `backend/routes/adminRoutes.js` et `backend/controllers/adminController.js`
- **Constat** : ces fichiers ne sont importés nulle part. `server.js` monte uniquement `/api/products`, `/api/orders` et `/api/auth`, et l'interface d'administration utilise ces routes.
- **Problèmes dans ce code mort** : statut `'Validée'` absent de l'enum du modèle `Order` (aurait été rejeté), et notifications envoyées vers `http://localhost:3001/notify`, où aucun service n'écoute (le service de notification écoute sur 4002, via le gateway sur 8000).
- **Recommandation** : supprimer ces fichiers ou les brancher dans `server.js` après correction (enum, URL du gateway).

<a id="s-2"></a>
#### S-2 — `gateway/routes/notif.js`
- **Constat** : fichier vide (0 octet), non importé ; le gateway utilise `gateway/routes/notifi.js`.
- **Recommandation** : supprimer le fichier.

### Non modifié volontairement

<a id="n-1"></a>
#### N-1 — Appel à `services/emailService` laissé commenté
- **Fichier** : `backend/controllers/authController.js`
- **Constat** : le module `backend/services/emailService` n'a jamais existé dans le dépôt (vérifié sur les 3 commits de l'historique Git). Décommenter `require('../services/emailService')` empêche le backend de démarrer (`Cannot find module`).
- **Piste** : un email de bienvenue devra passer par le microservice de notification via le gateway (`/notify`), comme la confirmation de commande.

---

## Points identifiés pour E28 (sécurité) — non traités à ce stade
- Prix et total de commande calculés à partir des données envoyées par le client.
- `DELETE /api/orders/:id` accessible à tout utilisateur connecté (pas de `isAdmin`).
- Aucune validation de type des entrées (ex. objet au lieu d'une chaîne pour `username` au login → risque d'injection NoSQL).
- Token JWT, mots de passe et mot de passe SMTP écrits dans les logs.
- CORS ouvert à toutes les origines.
- JWT stocké dans le `localStorage`.
- Erreur Nodemailer complète renvoyée au client.
- Dépendances à auditer (`npm audit`) et chaîne JWT à mettre à jour (cf. [ENV-1](#env-1)).
