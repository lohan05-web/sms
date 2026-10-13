# SmartSchool - Installation

Prerequisites
- Node.js >= 20 (see .nvmrc)
- npm >= 10+
- MySQL 8.0+ or Docker
- Git

Quick Start
1. cd C:\Users\DELL\Desktop\sms
2. npm install
3. Copy-Item .env.example .env
4. Generate secrets: node -e "require('crypto').randomBytes(48).toString('hex')"; update .env
5. docker compose up -d mysql (or start local MySQL)
6. npm run build:shared
7. npm run db:migrate
8. npm run db:seed
9. npm run dev

API: http://localhost:4000/api/v1/health
Super Admin: set via SEED_SUPER_ADMIN_EMAIL/PASSWORD or generated on seed.

