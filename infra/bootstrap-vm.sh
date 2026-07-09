#!/usr/bin/env bash
# ============================================================
# Bootstrap COMPLETO da VM em UM comando — sem secrets no GitHub.
# Clona o repo público, gera o .env e sobe a stack (Ghost×3 + MySQL + Caddy).
# A Caddy serve comenta.com.br (estático) e faz o HTTPS automático.
#
# Uso na VM (Ubuntu/Debian), como usuário com sudo:
#   curl -fsSL https://raw.githubusercontent.com/hebertpaes/lar-cia/main/infra/bootstrap-vm.sh | bash
# ============================================================
set -euo pipefail

REPO="https://github.com/hebertpaes/lar-cia.git"
DEST="/opt/lar-cia"

echo "→ Dependências (git, curl)…"
sudo apt-get update -y -qq
sudo apt-get install -y -qq git curl ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  echo "→ Instalando Docker…"
  curl -fsSL https://get.docker.com | sudo sh
fi

echo "→ Baixando o projeto em ${DEST}…"
if [ -d "${DEST}/.git" ]; then
  sudo git -C "${DEST}" fetch --depth 1 origin main
  sudo git -C "${DEST}" reset --hard origin/main
else
  sudo rm -rf "${DEST}"
  sudo git clone --depth 1 "${REPO}" "${DEST}"
fi

cd "${DEST}/infra"

if [ ! -f .env ]; then
  echo "→ Gerando .env (senha do MySQL aleatória)…"
  DBPASS="$(openssl rand -hex 24)"
  sudo tee .env >/dev/null <<EOF
# Gerado pelo bootstrap. Edite MAIL_* se quiser envio de e-mail pelo Ghost.
MYSQL_ROOT_PASSWORD=${DBPASS}
MAIL_SERVICE=
MAIL_USER=
MAIL_PASS=
EOF
fi

echo "→ Subindo a stack…"
sudo docker compose pull
sudo docker compose up -d
echo
sudo docker compose ps
echo
echo "Pronto. Assim que os DNS apontarem para o IP desta VM, a Caddy emite o HTTPS:"
echo "  • https://comenta.com.br/         (estático — já funciona sem configurar o Ghost)"
echo "  • https://hojemt.com.br/ , odiapolitico.com.br , pacunews.com.br  (abra /ghost p/ setup)"
echo "Acompanhe a emissão do certificado com:  sudo docker compose logs -f caddy"
