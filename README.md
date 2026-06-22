# LAR & CIA — Portal Imobiliário (Hebert Paes)

Aplicativo imobiliário moderno e responsivo (web/Android/iOS) para Cuiabá,
Várzea Grande e região — MT. Listagem de imóveis, busca e filtros, tema
claro/escuro, financiamento, agendamento de visitas, blog e captura de leads.

- **Frontend:** Flutter (Material 3, MVVM + Repository)
- **Backend/BD:** Firebase — Firestore, Auth, Storage, Functions, Analytics
- **Pagamentos:** Stripe · **IA de conteúdo:** via proxy OpenAI
- **Deploy:** Docker + Nginx (Cloud Run) ou Firebase Hosting
- **Projeto Firebase:** `hebert-paes-platform`

> ⚠️ **Importante:** o código-fonte Flutter (`lib/`, `web/`, `assets/`,
> `android/`, `ios/`) **não está versionado neste repositório** — apenas
> configuração, documentação e um preview web foram commitados. Veja
> [`preview/`](preview/) para uma reconstrução navegável do app e
> [Próximos passos](#próximos-passos) para restaurar o projeto completo.

## Estrutura do repositório

```
.
├── preview/              # Preview executável em HTML/JS (rode hoje)
├── seed/                 # Dados de exemplo compatíveis com o Firestore
├── web/nginx.conf        # Nginx do contêiner (SPA + cache + segurança)
├── Dockerfile(.web)      # Imagem que serve build/web via Nginx
├── firebase.json         # Hosting + Firestore + Storage
├── .firebaserc           # Alias do projeto Firebase
├── firestore.rules       # Regras de segurança do Firestore
├── firestore.indexes.json# Índices compostos
├── storage.rules         # Regras de segurança do Storage
├── .github/workflows/    # CI (validação + build) e Deploy (manual)
├── architecture.md       # Arquitetura e design
├── FIRESTORE_SCHEMA.md   # Schema das coleções
└── pubspec.yaml          # Dependências Flutter
```

## Rodar o preview (sem Flutter)

```bash
python3 -m http.server 8080
# abra http://localhost:8080/preview/
```
Detalhes em [`preview/README.md`](preview/README.md).

## Rodar o app Flutter (requer o `lib/`)

```bash
flutter pub get
flutter run -d chrome        # ou um device/emulador
flutter build web --release  # gera build/web/ (consumido pelos Dockerfiles)
```

## Backend e Banco de Dados (Firebase)

```bash
npm i -g firebase-tools
firebase login
firebase use hebert-paes-platform

# Deploy de regras e índices (Firestore + Storage)
firebase deploy --only firestore:rules,firestore:indexes,storage

# Popular dados de exemplo: ver seed/firestore-seed.json
firebase emulators:start --only firestore,storage,auth
```

## Deploy

- **CI** (`.github/workflows/ci.yml`): valida config/preview e, quando o
  `lib/` existir, roda `analyze` + `test` + `build web` + build Docker.
- **Deploy** (`.github/workflows/deploy.yml`): **manual** (Actions →
  *Deploy (Firebase)*), publica regras/índices ou hosting.

### Variáveis de ambiente / secrets

Build local: ver [`env.sample.sh`](env.sample.sh). Para os workflows,
configure em *Settings → Secrets and variables → Actions*:

| Secret | Uso |
|--------|-----|
| `FIREBASE_SERVICE_ACCOUNT` | Conta de serviço para deploy |
| `STRIPE_PUBLISHABLE_KEY` | Pagamentos |
| `OPENAI_PROXY_ENDPOINT` / `OPENAI_PROXY_API_KEY` | IA de conteúdo |
| `FINANCIAL_ENCRYPTION_KEY` | Criptografia de dados financeiros |

> Nunca commite chaves reais, `google-services.json` ou service accounts —
> o `.gitignore` já bloqueia esses arquivos.

## Próximos passos

1. **Restaurar o `lib/`** (código Dart) e `lib/firebase_options.dart` para
   habilitar build e deploy do app real; **ou**
2. **Evoluir a partir do `preview/`** (web-first) integrando o SDK web do
   Firebase. O CI/CD e as regras já estão prontos para ambos os caminhos.

## Documentação

[`architecture.md`](architecture.md) · [`FIRESTORE_SCHEMA.md`](FIRESTORE_SCHEMA.md)
· [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) · [`FIREBASE_STRUCTURE.md`](FIREBASE_STRUCTURE.md)
