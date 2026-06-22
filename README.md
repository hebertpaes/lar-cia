# LAR & CIA — Portal Imobiliário (Hebert Paes)

Portal imobiliário de Cuiabá, Várzea Grande e região (MT) construído sobre o
**[Ghost](https://ghost.org)** — CMS de publicação em Node.js, com membros,
newsletter e **assinaturas Stripe nativas**, usando **MySQL 8** como banco.

> Este repositório foi **consolidado no Ghost**. Os stacks anteriores
> (protótipo Flutter, Firebase/Firestore e a API MySQL custom) foram
> removidos; permanecem no histórico git, caso precise consultá-los.

## Estrutura

```
.
├── ghost/
│   ├── theme/lar-cia/      # tema Handlebars (o design LAR & CIA)
│   ├── routes.yaml         # coleções /imovel, /blog + taxonomia /categoria
│   ├── import/             # gerador + ghost-import.json (conteúdo)
│   ├── docker-compose.yml  # Ghost 5 + MySQL 8
│   └── README.md           # guia detalhado do Ghost
└── seed/seed.json          # dados de exemplo (fonte do import)
```

## Como o portal é modelado no Ghost

| Domínio | No Ghost |
|---|---|
| Imóveis | **Posts** (tag interna `#imovel`), coleção `/imovel/{slug}/` |
| Categorias | **Tags públicas** → `/categoria/{slug}/` |
| Finalidade (venda/aluguel/temporada) | **Tags públicas** |
| Blog | **Posts** (`#post`), coleção `/blog/` |
| Financiamento / Contato | **Páginas** (simulador em JS do tema) |
| Leads / Newsletter / Assinaturas | **Membros + Tiers (Stripe)** nativos |

## Rodar localmente

```bash
cd ghost
docker compose up        # Ghost em http://localhost:2368
```
Depois, no Admin (`/ghost`): crie o admin, ative o tema **lar-cia** e importe
`ghost/import/ghost-import.json` (Settings → Labs → Import content).
Passo a passo completo em [`ghost/README.md`](ghost/README.md).

## Validar / regerar

```bash
npx gscan ghost/theme/lar-cia              # validador oficial de temas
node ghost/import/generate-ghost-import.mjs # regerar o import a partir do seed
```

## Produção

- **Ghost Pro** (ghost.org): suba o tema (`.zip`) e importe o JSON — sem servidor.
- **Self-hosted**: `ghost install` (Ubuntu) + MySQL 8 + Nginx + SSL; conecte o
  Stripe em Settings → Membership.
