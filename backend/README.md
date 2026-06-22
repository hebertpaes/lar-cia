# LAR & CIA — Backend MySQL + API REST

Tradução relacional completa do schema do Firestore para **MySQL 8**, com uma
**API REST** (Node/Express) que o frontend (`preview/`) consome no mesmo formato.

```
backend/
├── db/
│   ├── schema.sql          # DDL: tabelas, ENUMs, FKs, índices
│   ├── seed.sql            # dados (gerado de seed/firestore-seed.json)
│   └── generate-seed.mjs   # regerador do seed.sql
├── server.js               # API Express + mysql2
├── package.json
├── docker-compose.yml      # MySQL 8 + API com um comando
├── Dockerfile
└── .env.example
```

## ▶️ Subir tudo com Docker (recomendado)

```bash
cd backend
docker compose up --build
# API:   http://localhost:3001/api/health
# MySQL: localhost:3306  (usuário lar_cia / senha lar_cia)
```
O `schema.sql` e o `seed.sql` são aplicados automaticamente na primeira subida.

## ▶️ Rodar manualmente (MySQL já instalado)

```bash
# 1) Banco + dados
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql

# 2) API
cp .env.example .env      # ajuste as credenciais
npm install
npm start                 # http://localhost:3001
```

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | `/api/health` | Status da API e do banco |
| GET  | `/api/properties` | Lista imóveis ativos. Filtros: `?category=`, `?rentalType=`, `?q=` |
| GET  | `/api/properties/:id` | Detalhe (com imagens e proximidades) |
| GET  | `/api/blog` | Posts do blog (com tags) |
| GET  | `/api/reviews` | Avaliações |
| POST | `/api/leads` | Cria lead `{name,email,phone,role,intent,wantsFinancing}` |
| POST | `/api/schedule` | Agenda visita `{clientName,clientEmail,start,mode,propertyId}` |

## Ligar o frontend ao MySQL

Em [`preview/data.js`](../preview/data.js):
```js
const USE_API = true;                          // usa o backend MySQL
const API_BASE = "http://localhost:3001/api";
```
Recarregue o preview — os dados passam a vir do MySQL. Sem isso, o preview
usa o seed local (offline).

## Modelo de dados (relacional)

- `users` — permissões como colunas booleanas (`perm_*`) + `access_level`
- `categories` — categorias de imóvel
- `properties` + `property_images` + `property_proximities` (1:N normalizado)
- `blog_posts` + `blog_post_tags`
- `property_reviews`, `leads`, `favorites` (N:N), `newsletter_subscriptions`
- `financing_applications` + `financing_documents`
- `schedule_events`

Índices compostos espelham `firestore.indexes.json` (ex.: `category+updated_at`,
`is_active+is_verified+created_at`, `leads.status+created_at`,
`schedule.agent_email+start`). Timestamps epoch (ms) viram `DATETIME`.

## Regenerar o seed

Os dados saem de `seed/firestore-seed.json` (fonte única). Após editá-lo:
```bash
npm run seed:gen   # reescreve db/seed.sql
```

## Produção

- Use senhas fortes (não `lar_cia/lar_cia`), TLS no MySQL e `CORS_ORIGIN`
  restrito ao domínio do site.
- Hospede a API (Cloud Run, Railway, VPS) e o MySQL (Cloud SQL, RDS,
  PlanetScale). Rode `schema.sql` uma vez; versione migrações depois.
