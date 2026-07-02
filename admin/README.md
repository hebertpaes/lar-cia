# Painel Lar&Cia — gestão em Python integrada ao Ghost

Camada de administração em **Python puro (sem dependências)** que gerencia
**imóveis** e **usuários/membros** pela **Ghost Admin API** — o mesmo
mecanismo que o Ghost.org usa para administrar sua comunidade de membros
(Members API) + conteúdo (Posts API).

```
admin/
├── ghost_client.py   # cliente da Ghost Admin API (JWT próprio, stdlib)
├── larcia.py         # CLI de gestão
├── dashboard.py      # painel web (http.server, sem Flask)
└── README.md
```

## Como o Ghost gerencia "usuários Pro / comunidade" (e nós também)

O Ghost expõe a **Members API** (`/ghost/api/admin/members/`) — é assim que o
ghost.org administra sua base de usuários/assinantes. Aqui:

- **Usuários/membros** → criados, listados e removidos via Members API
  (com rótulos/labels para segmentar: `lead`, `investidor`, `cliente`…).
- **Imóveis** → posts com a tag interna `#imovel` (categoria + finalidade),
  via Posts API.
- **Assinaturas pagas** → quando conectar o Stripe no Ghost, os mesmos
  membros viram assinantes (tiers) — sem mudar nada aqui.

## Configuração (uma vez)

1. No Ghost: **Settings → Integrations → Add custom integration** → copie a
   **Admin API Key** (formato `id:secret`).
2. Exporte as variáveis:
   ```bash
   export GHOST_URL="http://localhost:2368"          # ou seu domínio
   export GHOST_ADMIN_KEY="6a3c...:b1d9..."           # Admin API Key
   export PYTHONPATH="$(pwd)/admin"
   ```

## CLI

```bash
python3 admin/larcia.py stats
python3 admin/larcia.py membros list
python3 admin/larcia.py membros add --name "Maria" --email maria@x.com --labels "lead,site"
python3 admin/larcia.py membros rm  --email maria@x.com
python3 admin/larcia.py imoveis list
python3 admin/larcia.py imoveis add --json meu_imovel.json
python3 admin/larcia.py imoveis rm  --id <id>
```

`meu_imovel.json`:
```json
{ "title": "Casa no Jardim Itália", "location": "Jardim Itália, Cuiabá - MT",
  "price": 690000, "category": "casa", "rentalType": "sale",
  "bedrooms": 3, "bathrooms": 2, "garages": 2, "suites": 1, "area": 140,
  "isVerified": true, "images": ["https://.../foto.jpg"],
  "description": "..." }
```

## Painel web

```bash
GHOST_URL=http://localhost:2368 GHOST_ADMIN_KEY='id:secret' \
  PYTHONPATH=admin python3 admin/dashboard.py
# abre http://localhost:8700  → abas Imóveis e Usuários (criar/remover)
```

## Validação

Testado contra um Ghost v6 real: `stats`, criação/listagem/remoção de
membros e de imóveis funcionando (CRUD completo via Admin API). JWT assinado
em stdlib, idêntico ao do cliente oficial do Ghost.

## Produção

Funciona igual apontando para um Ghost hospedado: basta `GHOST_URL` =
domínio e a `GHOST_ADMIN_KEY` daquele site. Sirva o `dashboard.py` atrás de
autenticação (ele tem acesso total de admin).
