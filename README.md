# API Monitor — Backend

Backend NestJS de **API Monitor**, une plateforme full-stack de surveillance d'APIs et de services HTTP.

Le backend fournit l'API REST, l'authentification via Supabase, la gestion des services et monitors, l'exécution planifiée des checks, l'historique des résultats, les statistiques de disponibilité, la gestion des incidents et les notifications email.

## Architecture

```text
Next.js Web
    │ HTTPS + Bearer Supabase Access Token
    ▼
NestJS API
    ├── Supabase Auth       — authentification
    ├── Services            — regroupement des monitors
    ├── Monitors            — configuration des checks
    ├── Monitoring          — scheduler + requêtes HTTP
    ├── Check Results       — historique + statistiques
    ├── Incidents           — détection et résolution
    └── Notifications       — alertes et récupération par email
             │
             ▼
      PostgreSQL / Supabase
```

## Stack

- **NestJS 10** — API REST
- **TypeScript** — langage
- **Prisma 5** — ORM
- **PostgreSQL / Supabase** — base de données
- **Supabase Auth** — authentification
- **Swagger / OpenAPI** — documentation et test de l'API
- **class-validator** — validation des DTO
- **@nestjs/schedule** — exécution périodique des checks
- **Brevo** — notifications email
- **GitHub Actions** — CI et tests

## Fonctionnalités

### Authentification et sécurité

- Authentification avec les tokens Supabase
- Protection des routes métier par Bearer token
- Isolation des ressources par utilisateur
- Validation stricte des DTO
- Contrôle des URLs HTTP/HTTPS pour limiter les risques de SSRF

### Services

- Création, consultation et suppression de services
- Association de monitors à un service
- Isolation des données par utilisateur

### Monitors

Chaque monitor peut définir :

- un nom
- une URL HTTP/HTTPS
- une méthode HTTP (**GET** pour le MVP actuel)
- un intervalle de vérification
- un timeout
- un code HTTP attendu
- un état actif/inactif

### Monitoring automatique

Le scheduler s'exécute toutes les minutes et lance uniquement les checks arrivés à échéance.

Chaque vérification conserve :

- statut `UP` ou `DOWN`
- code HTTP reçu
- temps de réponse en millisecondes
- éventuelle erreur
- date et heure du check

Un check est considéré comme réussi lorsque le code HTTP reçu correspond au code attendu du monitor.

Le backend protège également l'enregistrement des résultats afin d'éviter les doublons lorsqu'un même monitor est traité de manière concurrente.

### Incidents et alertes

Lorsqu'un monitor passe en `DOWN`, un incident ouvert est créé s'il n'en existe pas déjà un pour ce monitor et cet utilisateur.

- Un incident reste ouvert pendant la période de panne.
- Les échecs suivants ne créent pas de nouveaux incidents pour la même panne.
- Lorsque le monitor redevient `UP`, l'incident ouvert est résolu.
- Une notification email est envoyée lors de la détection de l'incident.
- Une notification de récupération est envoyée lorsque le service revient à l'état `UP`.

Les emails sont envoyés via l'API SMTP de **Brevo**.

## Structure des données

```text
User
 └── Service
      └── Monitor
           ├── CheckResult
           └── Incident
```

- **User** : utilisateur authentifié.
- **Service** : groupe logique de monitors.
- **Monitor** : endpoint HTTP à surveiller.
- **CheckResult** : résultat historique d'une vérification.
- **Incident** : période de panne détectée pour un monitor.

## Modules

```text
src/
├── auth/                 # Validation des tokens Supabase
├── users/                # Gestion du profil applicatif
├── services/             # Services et ownership utilisateur
├── monitors/             # Configuration des monitors
├── monitoring/           # Scheduler et exécution des checks
├── check-results/        # Historique et statistiques
├── incidents/            # Incidents et notifications
├── dashboard/            # Statistiques du dashboard
├── notifications/        # Service de notification email
├── prisma/               # Prisma Client
├── common/               # Utilitaires partagés et sécurité URL
├── app.module.ts
└── main.ts
```

## API

Les routes métier utilisent :

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

### Health check

```http
GET /health
```

Route publique utilisée pour vérifier que l'API répond.

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

Les statistiques comprennent notamment le nombre de checks, les checks réussis/échoués, le pourcentage d'uptime et le temps de réponse moyen.

### Dashboard

```text
GET /dashboard/stats
```

Cette route fournit les indicateurs et la tendance utilisés par le dashboard frontend.

### Incidents

```text
GET /incidents
```

La route permet de consulter les alertes et incidents associés aux monitors de l'utilisateur.

## Swagger

La documentation OpenAPI est disponible en développement sur :

```text
http://localhost:3001/docs
```

En production :

```text
https://api-monitor-api-7q9b.onrender.com/docs
```

Swagger expose le schéma **Bearer Authentication**, permettant de tester les routes protégées avec un access token Supabase.

## Installation

### Prérequis

- Node.js 20 recommandé
- npm
- Un projet PostgreSQL/Supabase
- Un projet Supabase Auth
- Un compte Brevo avec un expéditeur vérifié pour les alertes email

### Installation

```bash
npm install
npx prisma generate
```

Copier `.env.example` vers `.env` et renseigner les valeurs adaptées à l'environnement.

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://...

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

FRONTEND_URL=http://localhost:3000

MONITORING_TIMEOUT=10000
MONITORING_RETRIES=0

BREVO_API_KEY=your_brevo_api_key
ALERT_FROM_EMAIL=verified_sender@example.com
ALERT_FROM_NAME=API Monitor
```

**Ne jamais commit une clé API, un mot de passe de base de données ou une clé Supabase secrète.**

### Développement

```bash
npm run start:dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm run start:prod
```

## Tests

Les services métier disposent de tests unitaires couvrant notamment :

- ownership et pagination des services
- ownership et configuration des monitors
- création/résolution des incidents
- notifications d'incident et de récupération
- historique des checks et calcul des statistiques

L'intégration continue est assurée par GitHub Actions.

```bash
npm test
npm run build
```

Workflow :

```text
.github/workflows/ci.yml
```

## Base de données

Le schéma Prisma se trouve dans :

```text
prisma/schema.prisma
```

Le script SQL Supabase se trouve dans :

```text
supabase/schema.sql
```

Le projet utilise également les politiques RLS de Supabase pour isoler les données selon l'utilisateur authentifié.

## Déploiement

Le backend est déployé sur **Render** avec **Supabase PostgreSQL**.

```text
Production API : https://api-monitor-api-7q9b.onrender.com
Swagger        : https://api-monitor-api-7q9b.onrender.com/docs
Health check   : https://api-monitor-api-7q9b.onrender.com/health
```

Configuration Render :

```text
Runtime       : Node
Build command : npm install && npm run build
Start command : npm run start:prod
Health check  : /health
Branch        : main
```

> **Note :** sur une offre d'hébergement gratuite pouvant mettre le service en veille, le scheduler de monitoring peut être interrompu pendant la période de veille. Pour une surveillance continue, le processus de monitoring doit rester actif ou être externalisé.

## Frontend

Le frontend du projet se trouve dans le dépôt :

https://github.com/Horace-web/api-monitor-web

Application en production :

https://api-monitor-web.vercel.app

## Licence

MIT

## Auteur

Horace-web

**Statut :** ✅ Projet terminé
