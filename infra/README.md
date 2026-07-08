# Infra — 3 portais Ghost na VM (Azure) + CDN

Sobe **Hoje MT**, **O Dia Político** e **Pacu News** numa VM com Docker.
Pilha: **Ghost 6 ×3 + MySQL 8 + Caddy** (HTTPS automático). A Caddy também
serve o site de comandos em `openclaw.comenta.com.br` (pasta `site/`).

> Este ambiente (sandbox) **não acessa sua VM**. Os comandos abaixo você roda
> na VM (direto por SSH, ou pedindo ao OpenClaw no seu Mac). O CI (opcional)
> automatiza o deploy depois.

## 1) Provisionar a VM (uma vez)
1. Na VM (Ubuntu 22.04+), abra as portas **80** e **443** no *Network Security
   Group* do Azure (HTTP/HTTPS).
2. Copie a pasta `infra/` para a VM (o CI faz isso, ou `scp -r infra user@IP:/opt/lar-cia/infra`).

## 2) DNS (antes de subir — a Caddy precisa disso p/ o HTTPS)
Aponte cada domínio para o **IP público da VM**:

| Registro | Nome | Valor |
|---|---|---|
| A | `hojemt.com.br` (e `www`) | IP da VM |
| A | `odiapolitico.com.br` (e `www`) | IP da VM |
| A | `pacunews.com.br` (e `www`) | IP da VM |
| A | `openclaw.comenta.com.br` | IP da VM |

> Se usar Cloudflare (recomendado), veja `CLOUDFLARE.md`. Durante a 1ª emissão
> do certificado, deixe o proxy do Cloudflare em **DNS only (cinza)**; depois
> ligue a nuvem laranja.

## 3) Subir
```bash
cd /opt/lar-cia/infra
cp .env.example .env      # edite as senhas
bash setup.sh
```

## 4) Configurar cada Ghost
Abra `https://<dominio>/ghost` → crie o admin → **Settings → Design → Change
theme → Upload** o `.zip` do portal (gerados por `ghost/theme/build-portal.sh`).
Depois cadastre as *Custom Integration* keys e ligue a automação (os secrets do
GitHub que você já usa).

## Operação
```bash
docker compose ps           # status
docker compose logs -f caddy   # ver emissão de HTTPS
docker compose pull && docker compose up -d   # atualizar (Ghost/MySQL/Caddy)
docker compose exec db mysqldump -uroot -p ghost_odiapolitico > backup.sql  # backup
```

Deploy automático (CI): veja `.github/workflows/deploy-vm.yml`.
