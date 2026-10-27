# OioProbe

Your servers, at a glance. An original, lightweight monitoring interface for personal VPS instances.

**Phase 0 / Phase 1:** The native Komari 1.5.1 core with a custom React 19 / TypeScript / Vite theme.
This project does not fork the Server or Agent components, replace data collection/authentication/database logic, connect production nodes, or deploy to production during this phase.

## Interface Preview

Current theme **0.1.2** features mist-white and graphite modes, a dot-map visualization, and a three-column resource-card layout.

[Desktop screenshot](evidence/chromium-desktop-overview-1440.png) · [Mobile screenshot](evidence/chromium-desktop-overview-390.png) · [Dark-mode screenshot](evidence/chromium-desktop-overview-dark.png)

## One-Command Deployment

On a fresh Linux VPS (root, with either Docker or systemd), run:

```bash
curl -fsSL https://raw.githubusercontent.com/VAR7IANT/OioProbe/main/install.sh | sudo bash
```

The installer:

1. Runs the pinned, checksum-verified Komari **1.5.1** core (Docker image if Docker is running, otherwise the official binary under systemd; x86_64 and arm64).
2. Starts it on loopback only, completes Komari's first-run setup with a random admin password, and installs and activates the OioProbe theme through Komari's own API. The port is opened to the network only after setup, so nobody can race the setup wizard.
3. Prints the dashboard URL, the admin login (also saved to `/opt/oioprobe/credentials`, mode 600), and a ready-to-paste Agent command for your first node.

Open TCP `25774` in your firewall / cloud security group, then visit `http://<server-ip>:25774`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `OIOPROBE_PORT` | `25774` | Listen port |
| `OIOPROBE_BIND` | `0.0.0.0` | Set `127.0.0.1` when a reverse proxy (Caddy / Nginx / Cloudflare Tunnel) provides HTTPS |
| `OIOPROBE_DIR` | `/opt/oioprobe` | Data, credentials and (native mode) binary |
| `OIOPROBE_MODE` | `auto` | `docker` or `native` to force a runtime |
| `OIOPROBE_USER` / `OIOPROBE_PASSWORD` | `admin` / random | Initial admin account |
| `OIOPROBE_THEME_ZIP` | latest GitHub Release | Theme ZIP URL or local path |

```bash
# example: behind a reverse proxy, custom port
curl -fsSL https://raw.githubusercontent.com/VAR7IANT/OioProbe/main/install.sh | sudo OIOPROBE_BIND=127.0.0.1 OIOPROBE_PORT=8080 bash
# upgrade the theme / core pin: simply re-run the install command (data and credentials are kept)
# uninstall (add --purge to delete data)
curl -fsSL https://raw.githubusercontent.com/VAR7IANT/OioProbe/main/install.sh | sudo bash -s -- uninstall
```

The theme is downloaded from the latest GitHub Release and verified against its `SHA256SUMS`. If no release has been published yet, the installer builds the theme from source in a throwaway `node:22` container (requires Docker). Maintainers publish a release by pushing a tag that matches the theme version: `git tag v0.1.2 && git push origin v0.1.2`.

> CI runs ShellCheck and a pin-sync check on the installer. Both runtime paths were exercised end to end against the real Komari 1.5.1 binary (the Docker path in a stand-in image built from that binary, since the official GHCR image could not be pulled in the test environment). Try it on a disposable VPS first if you are cautious.

### Manual Installation

If you prefer to do it by hand: start the core with Docker, then upload the theme ZIP (`oioprobe-theme.zip` from the Releases page, or build it with `npm ci && npm run theme:pack`) in Komari's admin theme manager and select **OioProbe**.

```bash
docker run -d --name oioprobe --restart unless-stopped -p 25774:25774 -v oioprobe-data:/app/data ghcr.io/komari-monitor/komari:1.5.1
```

A fresh panel without nodes displays an empty state. Add nodes from Komari's native admin panel (Clients → Add), which generates the Agent installation command. No shared token is shipped.

Inspect logs or stop the panel:

```bash
docker logs --tail 100 oioprobe
docker stop oioprobe
```

## Vercel Frontend + NAT Backend (Public Live Monitoring)

The frontend can be hosted separately on Vercel, while a NAT VPS exposes a dedicated HTTPS / WSS backend through Cloudflare Tunnel. Set the Vercel environment variable `VITE_KOMARI_ORIGIN` to the tunnel's public HTTPS origin. In Komari's admin panel, allowlist the Vercel site's origin for both CORS and WebSocket connections. If configuration or connection fails, **no demo data is displayed**.

See the [Vercel + NAT deployment guide](docs/VERCEL-NAT.md) for setup, security, and acceptance-test details.

## Local Development

Requires Node.js 22+ and Python 3 (for packaging themes and downloading the core).

```bash
npm ci
npm run dev:demo    # Explicit demo data for local UI preview
npm run dev         # Real API mode; never silently falls back to demo data
```

For real API mode, copy `apps/theme/.env.example` to `.env.development` and set the local `VITE_API_TARGET`. The default proxy points to `http://127.0.0.1:25774`. Use only an isolated development instance in this phase. Hash-based routing on the root page keeps Komari theme asset paths and page reloads compatible.

## Validation and Theme Artifacts

```bash
npm run check                       # Type checks / ESLint / unit contract tests / build
npx playwright install --with-deps chromium firefox webkit
npm run test:browser                 # Desktop + mobile layouts / states / search / routing
python3 scripts/fetch-komari.py      # Pinned release + official SHA-256 verification
npm run test:compat                  # Disposable local core; real HTTP / WebSocket tests
npm run theme:pack                   # artifacts/oioprobe-theme-0.1.2.zip
```

`test:compat` starts only a verified core bound to loopback and creates temporary SQLite data under `.local/`. It performs local installation, generates random credentials, creates synthetic nodes, validates the APIs, and removes the test directory. The fixtures disable external GeoIP lookups before startup, leaving the native binary unchanged. No remote API endpoint is used and no real Agent is installed. Theme selection applies only to this disposable instance.

## Implemented Features

- Overview dashboard, local dot-map visualization, and status/resource cards
- Node search, group/online filters, card/list views, node details, and basic CPU history
- Network and alert page shells; light/dark modes; local display preferences; browsable design system
- Real REST-contract integration, WebSocket `get` polling, exponential-backoff reconnection, staleness detection, and loading/empty/error/private-site states
- Native Komari admin entry point, standard theme packaging, and code/browser verification scripts

## Scope and Limitations

Network and alert pages are explicitly marked placeholders in this phase. There is no production data and no claim of 24-hour stability. CPU history is only a basic integration. Full ECharts charts, ping/packet-loss statistics, MapLibre, and alert policies are deferred.

The geographic map uses local outlines and SVG projection, with approximate regional reference markers; it does not infer actual server coordinates.

- [Architecture](docs/ARCHITECTURE.md)
- [Phases and acceptance criteria](docs/PHASES.md)
- [API compatibility](docs/API-COMPATIBILITY.md)
- [Design system](docs/DESIGN-SYSTEM.md)
- [Security boundaries](docs/SECURITY.md)
- [Acceptance records](docs/ACCEPTANCE.md)

Original OioProbe code is MIT-licensed. Komari copyrights and license notices are preserved in `THIRD-PARTY-NOTICES.md`.