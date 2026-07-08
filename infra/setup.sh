#!/usr/bin/env bash
# Bootstrap da VM (Ubuntu/Debian): instala Docker e sobe a stack dos 3 portais.
# Rode DENTRO da pasta infra/ na VM:  bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "→ Instalando Docker…"
  curl -fsSL https://get.docker.com | sh
fi

[ -f .env ] || { echo "✗ Crie o arquivo .env a partir do .env.example antes de subir."; exit 1; }

echo "→ Baixando imagens…"
docker compose pull
echo "→ Subindo a stack…"
docker compose up -d
echo "→ Status:"
docker compose ps
echo
echo "Pronto. Cada portal fica em https://<dominio> (a Caddy emite o HTTPS sozinha"
echo "quando os DNS já apontam para o IP desta VM). Abra /ghost em cada domínio"
echo "para o setup inicial do Ghost e suba o tema (.zip) em Design → Change theme."
