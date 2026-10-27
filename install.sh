#!/usr/bin/env bash
# OioProbe one-command installer: native Komari core (pinned, checksum-verified)
# + the OioProbe theme, initialised and activated through Komari's own API.
#
#   curl -fsSL https://raw.githubusercontent.com/VAR7IANT/OioProbe/main/install.sh | sudo bash
#   curl -fsSL .../install.sh | sudo bash -s -- uninstall [--purge]
#
# Re-running upgrades the theme and keeps data and credentials.
# Environment: OIOPROBE_{DIR,PORT,BIND,MODE,USER,PASSWORD,REF,THEME_ZIP}; see README.
set -eu

KOMARI_VERSION=1.5.1 # keep in sync with komari.lock.json (checked in CI)
SHA256_AMD64=469d5bf8299667639fd9ad4c5523344abee2287337a448d886775b3dce9817d2
SHA256_ARM64=21eca252151c3099a093c02130f6750ae6b860cf78cf8e4b50fc002c7007552f
REPO=VAR7IANT/OioProbe
AGENT_INSTALLER=https://raw.githubusercontent.com/komari-monitor/komari-agent/refs/heads/main/install.sh

DIR=${OIOPROBE_DIR:-/opt/oioprobe}
PORT=${OIOPROBE_PORT:-25774}
BIND=${OIOPROBE_BIND:-0.0.0.0} # use 127.0.0.1 behind a reverse proxy
MODE=${OIOPROBE_MODE:-auto}    # auto | docker | native
ADMIN_USER=${OIOPROBE_USER:-admin}
ADMIN_PASS=${OIOPROBE_PASSWORD:-}
REF=${OIOPROBE_REF:-main}      # branch/tag for the build-from-source fallback
THEME_ZIP=${OIOPROBE_THEME_ZIP:-https://github.com/$REPO/releases/latest/download/oioprobe-theme.zip}

NAME=oioprobe
IMAGE=ghcr.io/komari-monitor/komari:$KOMARI_VERSION
LOCAL=127.0.0.1
BASE=http://$LOCAL:$PORT
TMP=$(mktemp -d)
JAR=$TMP/cookies
trap 'rm -rf "$TMP"' EXIT

say() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root (e.g. ... | sudo bash)"
[ "$(uname -s)" = Linux ] || die "Linux only"
command -v curl >/dev/null || die "curl is required"
case $PORT in '' | *[!0-9]*) die "OIOPROBE_PORT must be a number" ;; esac

# ---------- mode / arch ----------
if [ "$MODE" = auto ]; then
  if command -v docker >/dev/null && docker info >/dev/null 2>&1; then MODE=docker
  elif command -v systemctl >/dev/null && [ -d /run/systemd/system ]; then MODE=native
  else die "need a running Docker daemon or systemd"; fi
fi
case $MODE in docker | native) ;; *) die "OIOPROBE_MODE must be auto, docker or native" ;; esac

# ---------- runtime control ----------
# docker: data lives in a bind mount (or the legacy `oioprobe-data` volume from the old README)
DATA=$DIR/data
if [ "$MODE" = docker ] && docker volume inspect oioprobe-data >/dev/null 2>&1 && [ ! -d "$DATA" ]; then
  DATA=oioprobe-data
fi

run_container() { # $1 = bind address
  docker rm -f $NAME >/dev/null 2>&1 || true
  docker run -d --name $NAME --restart unless-stopped \
    -p "$1:$PORT:25774" -v "$DATA:/app/data" "$IMAGE" >/dev/null
}

write_unit() { # $1 = bind address
  cat >/etc/systemd/system/$NAME.service <<EOF
[Unit]
Description=OioProbe (Komari $KOMARI_VERSION)
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$DIR
ExecStart=$DIR/bin/komari server --listen $1:$PORT
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable $NAME >/dev/null 2>&1
  systemctl restart $NAME
}

start_core() { # $1 = bind address
  if [ "$MODE" = docker ]; then run_container "$1"; else write_unit "$1"; fi
}

fetch_core() {
  if [ "$MODE" = docker ]; then
    docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull -q "$IMAGE" >/dev/null
    return
  fi
  local arch want
  case $(uname -m) in
    x86_64 | amd64) arch=amd64 want=$SHA256_AMD64 ;;
    aarch64 | arm64) arch=arm64 want=$SHA256_ARM64 ;;
    *) die "unsupported CPU: $(uname -m)" ;;
  esac
  mkdir -p "$DIR/bin"
  curl -fsSL -o "$TMP/komari" \
    "https://github.com/komari-monitor/komari/releases/download/$KOMARI_VERSION/komari-linux-$arch"
  [ "$(sha256sum "$TMP/komari" | cut -d' ' -f1)" = "$want" ] || die "Komari checksum mismatch"
  install -m 0755 "$TMP/komari" "$DIR/bin/komari"
}

# ---------- uninstall ----------
if [ "${1:-install}" = uninstall ]; then
  say "Removing OioProbe ($MODE)"
  docker rm -f $NAME >/dev/null 2>&1 || true
  if command -v systemctl >/dev/null; then
    systemctl disable --now $NAME >/dev/null 2>&1 || true
    rm -f /etc/systemd/system/$NAME.service
    systemctl daemon-reload || true
  fi
  if [ "${2:-}" = --purge ]; then
    rm -rf "$DIR"
    docker volume rm oioprobe-data >/dev/null 2>&1 || true
    say "Data purged"
  else
    say "Data kept in $DIR (add --purge to delete it)"
  fi
  exit 0
fi

# ---------- theme ----------
get_theme() { # writes $TMP/theme.zip
  local base=${THEME_ZIP%/*}
  if [ -f "$THEME_ZIP" ]; then cp "$THEME_ZIP" "$TMP/theme.zip"; return; fi
  if curl -fsSL -o "$TMP/theme.zip" "$THEME_ZIP" 2>/dev/null; then
    curl -fsSL -o "$TMP/SHA256SUMS" "$base/SHA256SUMS" || die "release has no SHA256SUMS"
    local want
    want=$(awk -v f="${THEME_ZIP##*/}" '$2 == f || $2 == "*" f { print $1 }' "$TMP/SHA256SUMS")
    [ -n "$want" ] && [ "$(sha256sum "$TMP/theme.zip" | cut -d' ' -f1)" = "$want" ] ||
      die "theme checksum mismatch"
    return
  fi
  say "No published release found; building the theme from source ($REF) in Docker"
  command -v docker >/dev/null || die "no release to download and no Docker to build from source"
  docker run --rm -v "$TMP:/out" node:22-bookworm bash -ec "
    command -v python3 >/dev/null || { apt-get update -qq && apt-get install -y -qq python3 >/dev/null; }
    git clone -q --depth 1 --branch '$REF' https://github.com/$REPO.git /src && cd /src
    npm ci --no-audit --no-fund >/dev/null && npm run theme:pack >/dev/null
    cp artifacts/oioprobe-theme-*.zip /out/theme.zip" || die "building the theme failed"
}

extract_zip() { # $1 zip, $2 dest
  if command -v unzip >/dev/null; then unzip -qo "$1" -d "$2"
  elif command -v python3 >/dev/null; then python3 -m zipfile -e "$1" "$2"
  else die "need unzip or python3"; fi
}

place_theme() {
  local stage=$TMP/theme
  mkdir -p "$stage"
  extract_zip "$TMP/theme.zip" "$stage"
  [ -f "$stage/komari-theme.json" ] && [ -f "$stage/dist/index.html" ] || die "invalid theme archive"
  if [ "$MODE" = docker ]; then
    docker exec $NAME rm -rf /app/data/theme/oioprobe
    docker exec $NAME mkdir -p /app/data/theme
    docker cp "$stage" $NAME:/app/data/theme/oioprobe
  else
    rm -rf "$DIR/data/theme/oioprobe"
    mkdir -p "$DIR/data/theme"
    cp -r "$stage" "$DIR/data/theme/oioprobe"
  fi
}

# ---------- API helpers ----------
api() { curl -fsS -m 15 -b "$JAR" -H 'Content-Type: application/json' "$@"; }

wait_ready() {

  for _ in $(seq 1 60); do
    curl -fsS -m 3 -o /dev/null "$BASE/api/install/status" 2>/dev/null && return
    sleep 1
  done
  die "Komari did not start; see: $([ "$MODE" = docker ] && echo "docker logs $NAME" || echo "journalctl -u $NAME")"
}

rand() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }

public_host() {
  curl -4fsS -m 5 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "<server-ip>"
}

# ---------- main ----------
say "Installing OioProbe: Komari $KOMARI_VERSION + theme ($MODE mode, data in ${DATA})"
mkdir -p "$DIR"
chmod 700 "$DIR"
CRED=$DIR/credentials
fetch_core
get_theme
# Bootstrap on loopback only, so nobody can race the first-run wizard from the Internet.
start_core "$LOCAL"
wait_ready

FRESH=0
if curl -fsS -m 5 "$BASE/api/install/status" | grep -q '"required":true'; then
  FRESH=1
  [ -n "$ADMIN_PASS" ] || ADMIN_PASS=$(rand 20)
  case $ADMIN_USER$ADMIN_PASS in *[\"\\]*) die "user/password must not contain quotes or backslashes" ;; esac
  say "Initialising Komari"
  api -X POST "$BASE/api/install/complete" -o /dev/null -d \
    "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\",\"sitename\":\"OioProbe\",\"description\":\"Your servers, at a glance.\",\"metric_dsn\":\"./data/metrics.db\"}"
  (umask 077 && printf 'username=%s\npassword=%s\n' "$ADMIN_USER" "$ADMIN_PASS" >"$CRED")
  for _ in $(seq 1 30); do
    curl -fsS -m 3 "$BASE/api/version" 2>/dev/null | grep -q '"version"' && break
    sleep 1
  done
elif [ -f "$CRED" ]; then
  ADMIN_USER=$(sed -n 's/^username=//p' "$CRED")
  ADMIN_PASS=$(sed -n 's/^password=//p' "$CRED")
fi

THEME_OK=0
if [ -n "$ADMIN_PASS" ] &&
  api -X POST "$BASE/api/login" -c "$JAR" -o /dev/null \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null; then
  say "Activating the OioProbe theme"
  place_theme
  api "$BASE/api/admin/theme/set?theme=oioprobe" -o /dev/null && THEME_OK=1
  if [ "$FRESH" = 1 ]; then
    NODE=$(api -X POST "$BASE/api/admin/client/add" -d '{"name":"my-first-node"}' 2>/dev/null || true)
    TOKEN=$(printf '%s' "$NODE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  fi
fi

if [ "$BIND" != "$LOCAL" ]; then
  say "Opening $BIND:$PORT"
  start_core "$BIND"
  wait_ready
fi

# ---------- summary ----------
HOST=$(public_host)
[ "$BIND" = "$LOCAL" ] && HOST=$LOCAL
URL=http://$HOST:$PORT
printf '\n\033[1;32mOioProbe is up\033[0m\n'
printf '  Dashboard : %s\n  Admin     : %s/admin\n' "$URL" "$URL"
if [ "$FRESH" = 1 ]; then
  printf '  Login     : %s / %s   (also saved to %s)\n' "$ADMIN_USER" "$ADMIN_PASS" "$CRED"
elif [ -f "$CRED" ]; then
  printf '  Login     : see %s\n' "$CRED"
fi
[ "$THEME_OK" = 1 ] ||
  printf '\n\033[1;33mTheme not activated automatically\033[0m (already initialised with other credentials?).\n  Log in at %s/admin and select the OioProbe theme in theme management.\n' "$URL"
if [ -n "${TOKEN:-}" ]; then
  printf '\nAdd your first node (run on the VPS you want to monitor):\n  bash <(curl -sL %s) -e %s -t %s\n' "$AGENT_INSTALLER" "$URL" "$TOKEN"
  printf 'More nodes: Admin -> Clients -> Add.\n'
fi
printf '\nOpen TCP %s in your firewall / cloud security group. For HTTPS put a reverse proxy in front\n(re-run with OIOPROBE_BIND=127.0.0.1 to keep the port private). Upgrade: re-run this command.\n' "$PORT"
