# Exam1 — Mini site e-commerce (stack MERN)

Application e-commerce : catalogue de produits, panier (Context API), commande avec choix
du transporteur et du mode de paiement, gestion des utilisateurs (`user` / `admin`),
notifications email et gestion du stock via des microservices.

## Architecture

| Composant | Dossier | Rôle | Port local |
|---|---|---|---|
| Frontend | `frontend/` | React (Create React App), servi par Nginx en conteneur | 3000 |
| Backend | `backend/` | API REST Express + MongoDB (Mongoose), authentification JWT | 5000 |
| Gateway | `gateway/` | Point d'entrée unique des microservices (`/notify`, `/update-stock`) | 8000 |
| Notifications | `microservices/notifications/` | Envoi des emails (Nodemailer, SMTP) | 4002 |
| Stock | `microservices/stock-management/` | Gestion du stock | 4003 |
| Base de données | — | MongoDB (local / Docker) ou MongoDB Atlas (préprod / prod) | 27017 |

Flux : navigateur → backend (`REACT_APP_API_URL`) → gateway (`GATEWAY_URL`) → microservices.
Les appels backend → microservices portent la clé partagée `INTERNAL_API_KEY`.

## Lancer en local avec Docker

```bash
cp .env.example .env        # puis renseigner JWT_SECRET, INTERNAL_API_KEY, identifiants SMTP
docker compose up --build
docker compose exec backend node seeder.js   # produits de démonstration
```

Application : http://localhost:3000 — API : http://localhost:5000/api — santé : http://localhost:5000/health

## Lancer sans Docker

Node.js 24 LTS requis.

```bash
cd backend && npm install && npm run dev      # API (nodemon)
cd frontend && npm install && npm start       # front
```

## Scripts backend

| Commande | Effet |
|---|---|
| `npm start` | Démarre l'API (production) |
| `npm run dev` | Démarre l'API avec rechargement automatique (nodemon) |
| `npm test` | Tests unitaires (`node --test`) : validation des entrées, JWT, contrôle d'accès |
| `npm run docs` | Génère la documentation JSDoc dans `backend/docs/` |

## Variables d'environnement

Toutes les variables sont décrites dans [`.env.example`](.env.example). Les secrets ne sont jamais versionnés
(`.env` est ignoré par Git et par les images Docker).

## Déploiement

- Hébergement : Render (un service par composant, conteneurs Docker ; front en static site) + MongoDB Atlas.
- CI/CD : GitHub Actions (`.github/workflows/ci-cd.yml`) — tests, build, images Docker, puis déploiement
  préproduction (branche `develop`) et production (branche `main`).
- Supervision : sondes `GET /health` sur chaque service.

## Journal des évolutions

Voir [`Changelog.md`](Changelog.md).
