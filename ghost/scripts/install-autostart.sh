#!/usr/bin/env bash
# =====================================================================
# Liga o Ghost (Lar&Cia) automaticamente no login do macOS, via LaunchAgent.
#
#   ghost/scripts/install-autostart.sh [PASTA_DA_INSTALACAO]
#
# Sem argumento, usa ~/lar-cia-ghost (padrão do quickstart). Para desativar:
#   launchctl unload ~/Library/LaunchAgents/com.larcia.ghost.plist
#   rm ~/Library/LaunchAgents/com.larcia.ghost.plist
# =====================================================================
set -euo pipefail

GHOST_DIR="${1:-${GHOST_DIR:-$HOME/lar-cia-ghost}}"
LABEL="com.larcia.ghost"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST="$PLIST_DIR/$LABEL.plist"
LOG="$HOME/Library/Logs/larcia-ghost.log"

# Pasta dos binários do Node (Apple Silicon/Intel via Homebrew, ou fallback)
if command -v brew >/dev/null 2>&1 && brew --prefix node@22 >/dev/null 2>&1; then
  NODE_BIN="$(brew --prefix node@22)/bin"
else
  NODE_BIN="$(dirname "$(command -v node 2>/dev/null || echo /usr/local/bin/node)")"
fi
GHOST_BIN="$(command -v ghost 2>/dev/null || echo "$NODE_BIN/ghost")"

if [ ! -f "$GHOST_DIR/.ghost-cli" ]; then
  echo "✗ Não encontrei uma instalação do Ghost em: $GHOST_DIR"
  echo "  Descubra a pasta com:  ghost ls   (coluna Location)"
  echo "  E rode:  ghost/scripts/install-autostart.sh /caminho/da/instalacao"
  exit 1
fi

mkdir -p "$PLIST_DIR" "$(dirname "$LOG")"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd "$GHOST_DIR" &amp;&amp; "$GHOST_BIN" start</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_BIN:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>WorkingDirectory</key><string>$GHOST_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLISTEOF
echo "✓ LaunchAgent criado: $PLIST"

if [ "$(uname)" = "Darwin" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load -w "$PLIST"
  echo "✓ Carregado — o Ghost vai ligar sozinho a cada login."
  echo "→ Ligando agora também…"
  ( cd "$GHOST_DIR" && "$GHOST_BIN" start ) || true
  echo "  Site:  http://localhost:2368"
  echo "  Logs:  $LOG"
  echo "  Desativar: launchctl unload \"$PLIST\" && rm \"$PLIST\""
else
  echo "ℹ Isto não é macOS — o plist foi gerado, mas só ativa rodando no Mac."
fi
