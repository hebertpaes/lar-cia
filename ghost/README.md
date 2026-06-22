# LAR & CIA no Ghost (ghost.org)

Implementação do portal LAR & CIA sobre o **Ghost** — CMS de publicação
(Node.js) com membros, newsletter e **assinaturas Stripe nativas**. O Ghost
usa **MySQL 8** como banco (reaproveita o stack relacional do projeto).

## Como o portal é modelado no Ghost

| Domínio | No Ghost |
|---|---|
| Imóveis | **Posts** com a tag interna `#imovel`, coleção `/imovel/{slug}/` |
| Categorias (casa, apê, fazenda…) | **Tags públicas** → páginas de arquivo `/categoria/{slug}/` |
| Finalidade (venda/aluguel/temporada) | **Tags públicas** |
| Blog | **Posts** com `#post`, coleção `/blog/` |
| Financiamento / Contato | **Páginas** (`/financiamento/`, `/contato/`) |
| Simulador, busca, tema escuro | JS do tema (`assets/js/main.js`) |
| Leads / Newsletter / Assinaturas | **Membros + Tiers (Stripe) nativos do Ghost** |

```
ghost/
├── theme/lar-cia/        # tema Handlebars (o design LAR & CIA)
│   ├── default.hbs  index.hbs  post.hbs  page.hbs  blog.hbs  tag.hbs
│   ├── partials/    (site-header, site-footer, property-card)
│   ├── assets/css/screen.css   assets/js/main.js
│   └── package.json
├── routes.yaml           # coleções /imovel, /blog + taxonomia /categoria
├── import/
│   ├── generate-ghost-import.mjs   # seed JSON → import do Ghost
│   └── ghost-import.json           # 13 posts, 18 tags (gerado)
└── docker-compose.yml    # Ghost + MySQL
```

## ▶️ Subir localmente

```bash
cd ghost
docker compose up          # Ghost em http://localhost:2368
```

Depois, no Ghost Admin (`/ghost`):
1. Crie a conta de administrador.
2. **Settings → Design → Change theme** → ative **lar-cia** (já montado).
   - (Para subir manualmente em um Ghost hospedado: `cd theme && zip -r lar-cia.zip lar-cia` e faça upload.)
3. **Settings → Labs → Import content** → selecione `import/ghost-import.json`.
4. **Settings → Navigation**: Imóveis `/`, Diferenciais `/#diferenciais`,
   Financiamento `/financiamento/`, Blog `/blog/`, Contato `/contato/`.
5. O `routes.yaml` já é montado pelo compose. (Hospedado: Labs → Routes → upload.)

## ▶️ Sem Docker (Ghost CLI, SQLite)

```bash
npm install ghost-cli -g
mkdir ghost-site && cd ghost-site
ghost install local                       # Ghost de desenvolvimento com SQLite
```

## ⚙️ Setup automatizado + testes

Com o Ghost no ar, configure tudo (admin, tema, conteúdo, rotas, marca) e
valide com um comando cada — sem clicar no Admin:

```bash
# configura admin + tema + import + routes + cor/navegação via Admin API
ADMIN_PASS='TroqueEstaSenha123' ghost/scripts/local-setup.sh

# testes de fumaça (HTTP 200 + marcadores de conteúdo)
ghost/scripts/smoke-test.sh
```

Validado em um Ghost **v6.46.0** local: upload do tema com gscan **0 erros /
0 avisos**, import **sem problemas**, e os 8 imóveis + blog + páginas
respondendo 200 (tags internas ocultas → 404).

## Assinaturas / Stripe (nativo)

`Settings → Membership → connect Stripe` e crie **Tiers**. Alinha com o
`flutter_stripe`/`STRIPE_PUBLISHABLE_KEY` do projeto: conteúdo e imóveis
podem ser públicos ou exclusivos para membros pagantes.

## Regenerar o import

Fonte única: `seed/seed.json`. Após editá-lo:
```bash
node import/generate-ghost-import.mjs   # reescreve import/ghost-import.json
```

## Validação do tema

```bash
npx gscan ghost/theme/lar-cia   # validador oficial de temas Ghost
```

## Produção (Ghost Pro ou self-hosted)

- **Ghost Pro** (ghost.org): suba o `lar-cia.zip` e importe o JSON — sem servidor.
- **Self-hosted**: `ghost install` (Ubuntu) + MySQL 8 + Nginx; aponte o domínio
  e ative SSL (`ghost setup ssl`).
