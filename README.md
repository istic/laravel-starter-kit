# Laravel Starter Kit

A Laravel 13 starter kit with version exposure, OpenTelemetry (backend + browser),
a dev-only Cloudflare tunnel, Pest test config, and a full CI/CD + Dependabot
pipeline pre-wired. Infra/ops scope only — no frontend framework opinion.

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
- **GHCR image name** — `.github/workflows/ci.yml`'s `env.IMAGE_NAME` defaults to `${{ github.repository }}`, which is usually correct as-is; also set `env.APP_NAME` there (currently `"<TODO: app name, e.g. myapp>"`, used for the SSH deploy user/path).
- **SSH deploy secrets** — in repo settings, add `SSH_HOST`, `SSH_HOST_PRODUCTION`, and `SSH_KEY`, for hosts already provisioned via `aquarion/autopelago`.
- **`REBASE_TOKEN`** — a PAT with `contents:write`/`pull-requests:write` on this repo, used by `auto-rebase-dependabot.yml` and `dependabot-make-release.yml` (`gh pr merge`) because the default `GITHUB_TOKEN` can't merge PRs.
- **Frontend OTEL CORS allow-list** (one-time, per project) — the OTLP ingest endpoint (`otlp.svc.istic.systems`) only accepts POSTs from allow-listed origins. Set `browser_otel: true` on the app's entry in `aquarion/autopelago`'s `host_vars/<host>/laravel_apps.yml` (staging inherits the flag from the parent app entry unless overridden). Without this, every browser error report fails silently — `reportError` never throws, by design, so there's no console signal that CORS is rejecting requests.
- Confirm `aquarion/autopelago` has provisioned the target staging/production host before the CI deploy jobs will succeed.

## Local development

This repo ships a [`pre-commit`](https://pre-commit.com) config (Pint, Composer lock validation, actionlint, detect-secrets, graphify). Install the hooks once per clone:

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

## Testing

```bash
composer lint:check   # Pint, --test mode
composer test          # Pest, parallel
```

## Version endpoint

`GET /version` returns `{"version", "pr_number", "branch"}` as JSON, sourced
from the `APP_VERSION`, `APP_PR_NUMBER`, and `APP_BRANCH` env vars via
`config('version')`.
