#!/usr/bin/env bash
# Sobe a stack dos 3 portais numa VM JÁ criada, em um passo.
# Uso (no seu Mac, na raiz do repo):
#   bash infra/subir-na-vm.sh azureuser@IP_DA_VM
#
# Envia a pasta infra/ para a VM, garante o .env e sobe tudo (Ghost×3 + MySQL +
# Caddy). As senhas do .env você confirma na VM antes de subir.
set -euo pipefail
DEST="${1:?uso: bash infra/subir-na-vm.sh azureuser@IP_DA_VM}"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "→ Preparando /opt/lar-cia na VM…"
ssh "$DEST" 'sudo mkdir -p /opt/lar-cia/infra && sudo chown -R $(whoami) /opt/lar-cia'

echo "→ Enviando infra/ (sem o .env)…"
rsync -avz --exclude='.env' "$HERE/" "$DEST:/opt/lar-cia/infra/"

echo "→ Garantindo o .env e subindo a stack…"
ssh -t "$DEST" 'cd /opt/lar-cia/infra && [ -f .env ] || cp .env.example .env && \
  echo && echo "Abra /opt/lar-cia/infra/.env e troque as senhas (nano .env)," && \
  echo "depois rode:  bash setup.sh" && echo'
echo
echo "Pronto o envio. Edite o .env na VM e rode 'bash setup.sh' (a Caddy sobe o HTTPS)."
