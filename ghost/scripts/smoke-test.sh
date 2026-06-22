#!/usr/bin/env bash
# Testes de fumaça contra um Ghost LAR & CIA já configurado.
#   GHOST_URL=http://localhost:2368 ghost/scripts/smoke-test.sh
set -uo pipefail
GHOST_URL="${GHOST_URL:-http://localhost:2368}"
fail=0

check() { # path  marcador  nome  [codigo_esperado=200]
  local path="$1" marker="$2" name="$3" want="${4:-200}"
  local body code
  body="$(curl -s -w $'\n%{http_code}' "$GHOST_URL$path")"
  code="$(printf '%s' "$body" | tail -1)"
  if [ "$code" = "$want" ] && { [ -z "$marker" ] || printf '%s' "$body" | grep -q "$marker"; }; then
    printf "  ✓ %-26s HTTP %s\n" "$name" "$code"
  else
    printf "  ✗ %-26s HTTP %s (esperado %s, marcador '%s')\n" "$name" "$code" "$want" "$marker"; fail=1
  fi
}

echo "Smoke tests → $GHOST_URL"
check "/"                  "property-grid" "home (vitrine)"
check "/"                  "LAR"           "home (marca)"
check "/imovel/prop-001/"  "prop-price"    "detalhe de imóvel"
check "/blog/"             "blog-grid"     "blog"
check "/financiamento/"    "financingForm" "financiamento (form)"
check "/contato/"          "WhatsApp"      "contato"
check "/categoria/apartamento/" "property-grid" "categoria apartamento"
check "/categoria/hash-imovel/" ""         "tag interna oculta" 404

cards="$(curl -s "$GHOST_URL/" | grep -o 'class=\"card\"' | wc -l | tr -d ' ')"
echo "  • imóveis na home: $cards (esperado 8)"; [ "$cards" = "8" ] || fail=1

[ "$fail" = "0" ] && echo "✓ Todos os testes passaram" || { echo "✗ Falhas detectadas"; exit 1; }
