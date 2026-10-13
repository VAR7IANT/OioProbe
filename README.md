# OioProbe

Your servers, at a glance. An original, lightweight monitoring interface for personal VPS instances.

**Phase 0 / Phase 1:** The native Komari 1.5.1 core with a custom React 19 / TypeScript / Vite theme.
This project does not fork the Server or Agent components, replace data collection/authentication/database logic, connect production nodes, or deploy to production during this phase.

## Interface Preview

Current theme **0.1.2** features mist-white and graphite modes, a dot-map visualization, and a three-column resource-card layout.

[Desktop screenshot](evidence/chromium-desktop-overview-1440.png) · [Mobile screenshot](evidence/chromium-desktop-overview-390.png) · [Dark-mode screenshot](evidence/chromium-desktop-overview-dark.png)

## Quick Deployment and Theme Activation

On an isolated test server with Docker installed and permission to run Docker, execute the following command. It starts the native Komari panel pinned to the verified **1.5.1** release, with persistent data in a named Docker volume:

```bash
docker run -d --name oioprobe --restart unless-stopped -p 25774:25774 -v oioprobe-data:/app/data ghcr.io/komari-monitor/komari:1.5.1
```

Open `http://<server-ip>:25774` in your browser and follow the initial setup wizard to create an administrator account. Ensure the port is reachable from your client. If a container named `oioprobe` already exists, inspect it instead of rerunning the creation command. If Komari 1.5.1 is already installed, proceed directly to theme installation.

### Install the OioProbe Theme

The command above starts the core service. Install and enable OioProbe from Komari's native theme management interface.

1. Open the repository's [Actions](https://github.com/VAR7IANT/OioProbe/actions). Locate the latest successful `Phase baseline verification` run that includes the theme-packaging step. Download and extract `phase-baseline-evidence`.
2. Inside its `artifacts/` folder, find `oioprobe-theme-0.1.2.zip`. Upload this **theme ZIP**, not the outer evidence archive or GitHub source archive.
3. Sign in to `http://<server-ip>:25774/admin`, upload the theme in the theme-management section, select **OioProbe**, enable it, and return to the home page.

Alternatively, on a system with Git, Node.js 22+, and Python 3, build the theme archive using:

```bash
git clone https://github.com/VAR7IANT/OioProbe.git && cd OioProbe && npm ci && npm run theme:pack
```

The output is `artifacts/oioprobe-theme-0.1.2.zip`. Upload and enable it following the admin steps above.

A fresh panel without nodes displays an empty state. Generate Agent installation commands for each node using Komari's native admin panel. This README does not provide a shared token or automatically onboard nodes.

Inspect logs or stop the test panel:

```bash
docker logs --tail 100 oioprobe
docker stop oioprobe
```

Stopping the container retains the named-volume data. Restart it with `docker start oioprobe`.

At this stage, only isolated verification of the native binary and theme has been completed. The Docker instructions follow [Komari's official deployment guide](https://www.komari.wiki/en/install/docker); deployment on a real Docker host has **not** yet been acceptance-tested.

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