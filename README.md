# Laravel Starter Kit

A Laravel 13 starter kit with version exposure, OpenTelemetry (backend + browser),
a dev-only Cloudflare tunnel, Pest test config, and a full CI/CD + Dependabot
pipeline pre-wired. Infra/ops scope only — no frontend framework opinion.

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Record notable changes under **Unreleased**
in the same PR that makes them.

## Getting started

> Plain `composer create-project istic/laravel-starter-kit` won't resolve yet —
> this repo is on GitHub (https://github.com/istic/laravel-starter-kit) but isn't
> registered on Packagist. Until it is, point Composer at the GitHub repo directly
> via a `vcs` repository (as below), or use a local `path` repository if working
> from a clone.

```bash
composer create-project istic/laravel-starter-kit my-app \
  --repository='{"type":"vcs","url":"https://github.com/istic/laravel-starter-kit"}' \
  --stability=dev
cd my-app
npm install
npm run build
```

`composer create-project` already installs PHP dependencies and, via
`composer.json`'s `post-root-package-install`/`post-create-project-cmd` hooks,
copies `.env.example` to `.env`, generates `APP_KEY`, and runs migrations —
you only need to install and build frontend assets afterward.

If you're working directly in a clone of this repo instead (no `create-project`),
run `composer setup` instead, which chains `composer install` + `.env` copy +
key generation + migrate + `npm install` + `npm run build` in one step.

### `ext-opentelemetry` and `composer install`

`composer.json` declares `ext-opentelemetry` as a platform requirement (it backs
the backend OTEL auto-instrumentation). Composer enforces platform requirements
by default, including during `composer create-project` — so any machine running
plain `composer` commands against this project needs the PECL `opentelemetry`
extension physically installed (`pecl install opentelemetry`, or your
distro/package-manager equivalent).

This also applies inside Sail: the stock Sail 8.4 runtime image
(`vendor/laravel/sail/runtimes/8.4/Dockerfile`) does **not** install
`ext-opentelemetry` by default. So `./vendor/bin/sail composer install` will hit
the same platform check failure out of the box, unless you opt in:

- Uncomment `PHP_EXTENSIONS=opentelemetry` in `.env` and rebuild
  (`./vendor/bin/sail build --no-cache`) — `compose.yaml` already threads it
  into the Sail image's `PHP_EXTENSIONS` build arg, **or**
- Run Composer commands with `--ignore-platform-req=ext-opentelemetry` (both on
  bare metal and inside Sail) if you don't need backend OTEL working locally.

The production image (`docker/production/Dockerfile`) is unaffected — it
installs the extension via `install-php-extensions opentelemetry` before running
`composer install`.

## Placeholders to fill in after `create-project`

- **App name** — set `APP_NAME` in `.env` (feeds `OTEL_RESOURCE_ATTRIBUTES` and the frontend's `VITE_APP_NAME` via `docker/production/Dockerfile`'s `ARG APP_NAME`).
- **`docker/production/Dockerfile` image labels** — replace the hardcoded `LABEL maintainer="<TODO: your name/team>"` and `LABEL description="<TODO: app name> production image"` placeholders directly in the Dockerfile; these are separate from `APP_NAME` and aren't populated by any env var.
- **`docker/cloudflared/config.yml`** — replace `<TUNNEL_UUID>` and `<app>` with a real tunnel, after running (one-time, per project):

  ```sh
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel login
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel create <app>
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel route dns <app> <app>.istic.dev
  ```

  Then fill in the real tunnel UUID, credentials filename, and hostnames in `docker/cloudflared/config.yml`.

  Two gotchas found while actually wiring this up end-to-end (bloom#433):
  - `cloudflared tunnel login`'s resulting cert is scoped to a *single* Cloudflare zone, picked in the browser flow — reusing `docker/cloudflared/data/cert.pem` from a different project's login doesn't error, it silently makes `tunnel route dns` write into whatever zone that old cert is scoped to instead of `istic.dev` (you'll see a nested hostname like `<app>.istic.dev.<other-zone>` rather than `<app>.istic.dev`). Check which zone the cert is actually scoped to (or re-run `tunnel login` for a fresh one) before trusting that `route dns` landed correctly — it's easy to not notice since the command exits successfully either way.
  - This kit's `vite.config.js` has no handling for being accessed through the `vite-<app>.istic.dev` route `config.yml` sets up: `laravel-vite-plugin` bakes the dev-server asset origin into `public/hot` once at server start (defaulting to `localhost:5173`), and a page served over the tunnel's HTTPS blocks that as mixed content — the page renders blank, not degraded. `istic/alchemistic`'s `vite.config.js` (the actual proven source this tunnel setup was ported from) solves it with a `CLOUDFLARE_VITE_HOSTNAME` env var that overrides `server.origin`, `server.hmr` (separate from the asset origin — needs its own `wss`/443 override, laravel-vite-plugin doesn't touch it), and `allowedHosts`; also use a *scoped* `server.cors.origin` (the app's own origin, not the vite server's) rather than a wildcard if you add CORS headers for this, since the dev server is reachable from the public internet once tunneled. Not ported into this kit's generic `vite.config.js` (no frontend-stack opinion is explicit non-goal territory), but worth knowing before you hit a silently-blank page in a new project that uses the tunnel with real frontend assets.
- **GHCR image name** — `.github/workflows/ci.yml`'s `env.IMAGE_NAME` defaults to `${{ github.repository }}`, which is usually correct as-is; also set `env.APP_NAME` there (currently `"<TODO: app name, e.g. myapp>"`, used for the SSH deploy user/path).
- **SSH deploy secrets** — in repo settings, add `SSH_HOST`, `SSH_HOST_PRODUCTION`, and `SSH_KEY`, for hosts already provisioned via `aquarion/autopelago`.

  These names don't match what autopelago actually sets up for firth apps: its `firth_laravel_app` role uploads the app user's deploy key as **`FIRTH_SSH_KEY`** (`roles/firth_laravel_app/tasks/system_user.yml`) and sets no host secrets at all. The symptom is `deploy-staging` failing with `error: missing server host` from `appleboy/ssh-action`. For an app deployed to firth via autopelago, either:
  - edit `ci.yml` to match, as `aquarion/bloom` and `aquarion/lifestream-web` do — `host: firth.istic.systems` (staging) / `host: firth.water.gkhs.net` (production), `key: ${{ secrets.FIRTH_SSH_KEY }}`, `username: ${{ env.APP_NAME }}`, with paths `/home/docker/<APP_NAME>-staging` and `/home/docker/<APP_NAME>`; or
  - set `SSH_HOST`, `SSH_HOST_PRODUCTION`, and `SSH_KEY` yourself.

  The `FIRTH_SSH_KEY` name is deliberate: for `istic` org repos it's meant to be set once as an organisation secret (possibly covering multiple hosts), while for personal-account (`aquarion/*`) repos autopelago sets it per repo.
- **`DEPLOY_NOOP` repo variable** (Settings → Secrets and variables → Actions → Variables) — a new project starts *without* this set, which is intentional: `deploy-staging`/`deploy-production` will fail loudly against the SSH deploy secrets above until you configure them, rather than silently skipping forever. It's an opt-in escape hatch, not a default — only set it to `true` if you deliberately want CI to pass without deploying (e.g. while a host is still being provisioned), and remove it once the real host is ready. Being a repo variable, not a file in this repo, it never carries over from `create-project`/cloning — `istic/laravel-starter-kit` itself has it set to `true` in its own repo settings only, since the template repo has no deploy target at all.
- **`REBASE_TOKEN`** — a PAT with `contents:write`/`pull-requests:write` on this repo, used by `auto-rebase-dependabot.yml` and `dependabot-make-release.yml` (`gh pr merge`) because the default `GITHUB_TOKEN` can't merge PRs.
- **Frontend OTEL CORS allow-list** (one-time, per project) — the OTLP ingest endpoint (`otlp.svc.istic.systems`) only accepts POSTs from allow-listed origins. Set `browser_otel: true` on the app's entry in `aquarion/autopelago`'s `host_vars/<host>/laravel_apps.yml` (staging inherits the flag from the parent app entry unless overridden). Without this, every browser error report fails silently — `reportError` never throws, by design, so there's no console signal that CORS is rejecting requests.
- Confirm `aquarion/autopelago` has provisioned the target staging/production host before the CI deploy jobs will succeed.

## Local development

This repo ships a [`pre-commit`](https://pre-commit.com) config (Pint, PHPStan, Biome, Composer lock validation, actionlint, detect-secrets, graphify). Install the hooks once per clone:

```bash
pre-commit install
```

Requires `composer install` to have already been run (see "Getting started" above) —
`compose.yaml`'s `laravel.test` service builds from
`./vendor/laravel/sail/runtimes/8.4`, a path inside `vendor/`, which only exists
after Composer has installed dependencies.

```bash
./vendor/bin/sail up -d
```

Brings up the app, MySQL, Redis, Mailpit, and the `cloudflared` dev tunnel (once configured per above). The tunnel's Cloudflare account cert and per-tunnel credentials live in `docker/cloudflared/data/` (gitignored, bind-mounted into the container).

Sessions are Redis-backed by default (`SESSION_DRIVER=redis` in `.env.example`, `REDIS_HOST=redis` matching Sail's `redis` service hostname). In production, `SESSION_DRIVER` and `REDIS_HOST` are injected together by the deploy target (e.g. `aquarion/autopelago`'s `firth_laravel_app` role, conditionally on that app having Redis configured) — if neither is injected, Laravel falls back to its own `database` session default. Injecting one without the other (`SESSION_DRIVER=redis` with no reachable `REDIS_HOST`) is not a safe state — it fails at connection time rather than falling back — so treat them as a pair.

## Testing

```bash
composer lint:check   # Pint, --test mode
composer stan         # PHPStan (Larastan), level 4
composer test         # Pest, parallel
npm run lint:check    # Biome lint
npm run format:check  # Biome format check
```

## Version endpoint

`GET /version` returns `{"version", "pr_number", "branch"}` as JSON, sourced
from the `APP_VERSION`, `APP_PR_NUMBER`, and `APP_BRANCH` env vars via
`config('version')`.

## Matomo analytics

Set `MATOMO_URL` and `MATOMO_AUTH_TOKEN` to enable tracking. On first request,
`App\Services\MatomoService` finds the Matomo site whose main URL matches
`APP_URL` (creating it if missing), ensures every goal listed in
`config('services.matomo.goals')` exists, and caches the result for an hour.
If either env var is unset, or the Matomo API fails (logged as a warning), no
tracker is rendered.

Include `@include('partials.matomo')` in a layout's `<head>` to load the
tracker (the welcome page already does). `resources/js/matomo.js` exports
`trackPageView`, `trackEvent` and `trackGoal('<goal key>')` helpers; all are
no-ops when Matomo is not configured.
