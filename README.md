# API Monitor — Backend API

Backend NestJS de **API Monitor**, une plateforme de surveillance d'APIs et de services HTTP.

Le MVP permet à un utilisateur authentifié de créer des services, d'y associer des monitors HTTP et de conserver l'historique des vérifications afin de suivre la disponibilité et les temps de réponse.

## Architecture

```text
Next.js Web
    │ HTTPS + Bearer Supabase Access Token
    ▼
NestJS API
    ├── Supabase Auth — authentification
    ├── Services      — regroupement des monitors
    ├── Monitors      — configuration des checks
    ├── Monitoring    — scheduler + requêtes HTTP
    └── Check Results — historique + statistiques
             │
             ▼
      PostgreSQL / Supabase
```

### Stack

- **NestJS 10** — API REST
- **TypeScript** — langage
- **Prisma 5** — ORM
- **PostgreSQL / Supabase** — base de données
- **Supabase Auth** — authentification des utilisateurs
- **Swagger / OpenAPI** — documentation et test de l'API
- **class-validator** — validation des DTO
- **@nestjs/schedule** — exécution périodique des checks

Supabase Auth fournit les access tokens utilisés par le frontend. Le backend vérifie le token auprès de Supabase avant d'autoriser l'accès aux routes protégées.

## Structure des données

```text
User
 └── Service
      └── Monitor
           └── CheckResult
```

- **User** : utilisateur authentifié par Supabase.
- **Service** : groupe logique de monitors.
- **Monitor** : endpoint HTTP à surveiller.
- **CheckResult** : résultat historique d'une vérification.

Les incidents et notifications sont prévus pour une évolution ultérieure du projet.

## Modules

```text
src/
├── auth/                 # Validation des tokens Supabase
├── users/                # Gestion du profil applicatif
├── services/             # Services et ownership utilisateur
├── monitors/             # Configuration des monitors
├── monitoring/           # Scheduler et exécution des checks
├── check-results/        # Historique et statistiques
├── incidents/            # Base pour les incidents futurs
├── prisma/               # Prisma Client
├── common/               # Utilitaires partagés et sécurité URL
├── app.module.ts
└── main.ts
```

## Fonctionnalités MVP

### Services

- Lister ses services
- Consulter un service
- Créer un service
- Supprimer un service
- Isolation des données par utilisateur

### Monitors

- Méthode **GET** pour le MVP
- URL HTTP/HTTPS
- Nom du monitor
- Intervalle configurable, minimum **60 secondes**
- Timeout configurable
- Code HTTP attendu configurable
- Activation / désactivation
- Suppression
- Isolation par propriétaire du service

### Monitoring

Le scheduler s'exécute toutes les minutes. Pour chaque monitor actif, il vérifie si son intervalle est arrivé à échéance avant de lancer un nouveau check.

Chaque vérification enregistre :

- statut `UP` ou `DOWN`
- code HTTP reçu
- temps de réponse en millisecondes
- éventuelle erreur
- date et heure du check

Un check est considéré comme réussi lorsque le code HTTP reçu correspond au code attendu du monitor.

### Sécurité des URLs

Les URLs fournies par les utilisateurs sont contrôlées avant leur utilisation afin de limiter les risques de SSRF. Le backend accepte uniquement HTTP/HTTPS et bloque notamment les destinations locales, loopback, privées, link-local et certaines adresses réservées.

Cette protection est une défense applicative ; pour un déploiement à grande échelle, un mécanisme d'egress dédié ou de résolution réseau plus stricte pourra être ajouté.

## API

Toutes les routes métier sont protégées par :

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

### Health check

```http
GET /health
```

Route publique utilisée notamment par l'hébergement pour vérifier que l'API répond.

### Services

```text
GET    /services
GET    /services/:id
POST   /services
DELETE /services/:id
```

### Monitors

```text
GET    /monitors
GET    /monitors/:id
GET    /monitors?serviceId=:serviceId
POST   /monitors
POST   /monitors/:id/activate
POST   /monitors/:id/deactivate
DELETE /monitors/:id
```

### Check results

```text
GET /check-results/monitor/:monitorId
GET /check-results/monitor/:monitorId/stats
```

Le paramètre `limit` permet de limiter l'historique retourné. Les statistiques comprennent notamment le nombre total de checks, les checks réussis/échoués, le pourcentage d'uptime et le temps de réponse moyen.

## Swagger

En développement, la documentation OpenAPI est disponible sur :

```text
http://localhost:3001/api
```

Swagger expose également le schéma **Bearer Authentication**, ce qui permet de tester les routes protégées avec un access token Supabase.

## Installation

### Prérequis

- Node.js 20 recommandé
- npm
- Un projet PostgreSQL/Supabase
- Un projet Supabase Auth configuré

### Installation des dépendances

```bash
npm install
```

### Génération de Prisma Client

```bash
npx prisma generate
```

### Variables d'environnement

Copier `.env.example` vers `.env` puis renseigner les valeurs adaptées à l'environnement.

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://...

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

FRONTEND_URL=http://localhost:3000

MONITORING_TIMEOUT=10000
MONITORING_RETRIES=0
```

**Ne jamais commit une `DATABASE_URL` contenant un mot de passe ni une clé Supabase secrète.** La clé secrète/service role n'est pas nécessaire au fonctionnement normal de cette API et ne doit jamais être exposée au frontend.

### Lancer en développement

```bash
npm run start:dev
```

### Build de production

```bash
npm run build
```

### Démarrer en production

```bash
npm run start:prod
```

## Base de données

Le schéma Prisma se trouve dans `prisma/schema.prisma`.

Le script SQL de création du schéma Supabase se trouve dans :

```text
supabase/schema.sql
```

Les noms Prisma sont mappés vers les tables et colonnes SQL utilisées par Supabase.

Le projet utilise également des politiques RLS côté Supabase pour isoler les données selon l'utilisateur authentifié.

## CI

GitHub Actions vérifie automatiquement le backend sur les pushes et pull requests vers `main` :

1. Installation des dépendances
2. Génération de Prisma Client
3. Build NestJS

Workflow : `.github/workflows/ci.yml`

## Déploiement

Le backend est prévu pour être déployé sur **Render** avec PostgreSQL fourni par **Supabase**.

Configuration prévue :

```text
Runtime       : Node
Build command : npm install && npm run build
Start command : npm run start:prod
Health check  : /health
Branch        : main
```

Les variables d'environnement sont configurées directement sur la plateforme de déploiement et ne doivent pas être commitées dans Git.

> **Note monitoring :** un hébergement gratuit qui met le service en veille peut interrompre temporairement le scheduler. Pour une surveillance réellement continue, l'instance de monitoring devra rester active ou le scheduler devra être externalisé.

## Évolutions prévues

Le MVP reste volontairement simple. Les évolutions possibles sont :

- gestion des incidents
- règle de confirmation après plusieurs échecs consécutifs
- notifications email
- graphiques d'uptime et de temps de réponse
- pagination et rétention des historiques
- méthodes POST/PUT/PATCH/DELETE pour les checks avancés
- meilleure gestion des checks à grande échelle
- séparation éventuelle du scheduler dans un worker dédié

## Licence

MIT

## Auteur

Horace-web

**Statut :** 🚧 Backend MVP en cours de finalisation et de déploiement.