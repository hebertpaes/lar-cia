# LAR & CIA — Preview executável (HTML/JS)

Protótipo navegável do portal imobiliário **LAR & CIA (Hebert Paes)**, reconstruído a
partir da documentação do repositório (`architecture.md`, `FIRESTORE_SCHEMA.md`,
`FIREBASE_STRUCTURE.md`). Serve para **analisar a aplicação e iniciar a produção**.

> ⚠️ O código-fonte Flutter original **não está neste repositório** (só configuração e
> documentação foram commitados). Este preview reimplementa o design e o fluxo
> documentados em HTML/CSS/JS puro, usando o mesmo schema de dados do Firestore.

## ▶️ Como rodar

A partir da **raiz do repositório** (o app lê `../seed/firestore-seed.json`):

```bash
# Opção 1 — Python (já instalado)
python3 -m http.server 8080
# abra http://localhost:8080/preview/

# Opção 2 — Node
npx serve -l 8080 .
```

## ✨ O que o preview demonstra

| Recurso | Implementado |
|---|---|
| Tema claro/escuro (persistido) | ✅ |
| Busca (local, finalidade, tipo) estilo Airbnb | ✅ |
| Filtro por categoria (12 categorias do schema) | ✅ |
| Grid responsivo de imóveis + cards | ✅ |
| Favoritos (persistidos em localStorage) | ✅ |
| Badge "Verificado" (verificationScore) | ✅ |
| Ordenação (preço, área, recentes, relevância) | ✅ |
| Modal de detalhe do imóvel | ✅ |
| Simulador de financiamento (Tabela Price) | ✅ |
| Captura de lead (schema `leads`) | ✅ (console/demo) |
| Blog (schema `blog_posts`) | ✅ |
| WhatsApp / contato (+55 65 99988-7766) | ✅ |

Os dados vêm de `../seed/firestore-seed.json`, **compatível com o schema do Firestore**.
Em produção, as funções `load*()` em `app.js` são trocadas por listeners
`firestore.collection(...).snapshots()`.

## 🧱 Estrutura

```
preview/
├── index.html     # estrutura da página (header, hero, grid, modal, formulários)
├── styles.css     # design system (vars de tema, cor de marca #1976D2, Inter)
├── app.js         # dados, filtros, busca, favoritos, modal, financiamento, leads
└── README.md
seed/
└── firestore-seed.json   # dados de exemplo (users, properties, blog_posts, ...)
```

## 🚀 Caminho para produção (frontend · backend · BD)

### Opção A — Restaurar o app Flutter (o original)
1. Recuperar o `lib/` (código Dart) — **ausente no repo**. Sem ele, faltam
   `main.dart`, models, services, screens e `firebase_options.dart`.
2. `flutter pub get` (deps já fixadas em `pubspec.lock`).
3. `flutter build web` → gera `build/web/` (consumido por `Dockerfile`/`nginx.web.conf`).

### Opção B — Evoluir a partir deste preview (web-first)
1. **Frontend**: este HTML/JS já é o ponto de partida; integrar o SDK web do
   Firebase para dados reais.
2. **Backend/BD (Firebase)** — artefatos já prontos no repo:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use hebert-paes-platform
   firebase deploy --only firestore:rules,firestore:indexes
   ```
3. **Popular o banco** com o seed (via Emulator ou script Admin SDK):
   ```bash
   firebase emulators:start --only firestore
   # importe seed/firestore-seed.json com um script usando firebase-admin
   ```
4. **Secrets** (`env.sample.sh`): Stripe, proxy OpenAI, chave de criptografia.
5. **Deploy do frontend**: `Dockerfile` + `nginx.web.conf` → Cloud Run, ou
   `firebase deploy --only hosting`.

> **Projeto Firebase**: `hebert-paes-platform` · **Admin padrão**: `ciencia@msn.com`
