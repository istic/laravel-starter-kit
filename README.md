# Laravel Starter Kit

A Laravel 13 starter kit with version exposure, OpenTelemetry (backend + browser),
a dev-only Cloudflare tunnel, Pest test config, and a full CI/CD + Dependabot
pipeline pre-wired. Infra/ops scope only — no frontend framework opinion.

## Getting started

```bash
composer create-project istic/laravel-starter-kit my-app
cd my-app
cp .env.example .env
php artisan key:generate
composer install
npm install
php artisan migrate
npm run build
```

### `ext-opentelemetry` and `composer install`

`composer.json` declares `ext-opentelemetry` as a platform requirement (it backs
the backend OTEL auto-instrumentation). Composer enforces platform requirements
by default, including during `composer create-project` — so any machine running
plain `composer` commands against this project needs the PECL `opentelemetry`
extension physically installed (`pecl install opentelemetry`, or your
distro/package-manager equivalent).

This also applies inside Sail: the stock Sail 8.4 runtime image
(`vendor/laravel/sail/runtimes/8.4/Dockerfile`) does **not** install
`ext-opentelemetry`, and `compose.yaml` doesn't pass a `PHP_EXTENSIONS` build arg
to add it. So `./vendor/bin/sail composer install` will hit the same platform
check failure out of the box.

Until the Sail image is extended to include the extension, the practical options
are:

- Add `ext-opentelemetry` to `PHP_EXTENSIONS` in your `.env` and pass it through
  `compose.yaml`'s `laravel.test` build args (matching the pattern already used
  for `WWWGROUP`), or extend the Sail Dockerfile directly, **or**
- Run Composer commands with `--ignore-platform-req=ext-opentelemetry` (both on
  bare metal and inside Sail) if you don't need backend OTEL working locally.

The production image (`docker/production/Dockerfile`) is unaffected — it
installs the extension via `install-php-extensions opentelemetry` before running
`composer install`.

## Placeholders to fill in after `create-project`

- **App name** — set `APP_NAME` in `.env` (feeds `OTEL_RESOURCE_ATTRIBUTES` and Docker image labels via `docker/production/Dockerfile`'s `ARG APP_NAME`).
- **`docker/cloudflared/config.yml`** — replace `<TUNNEL_UUID>` and `<app>` with a real tunnel, after running (one-time, per project):

  ```sh
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel login
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel create <app>
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel route dns <app> <app>.istic.dev
  ```

  Then fill in the real tunnel UUID, credentials filename, and hostnames in `docker/cloudflared/config.yml`.
- **GHCR image name** — `.github/workflows/ci.yml`'s `env.IMAGE_NAME` defaults to `${{ github.repository }}`, which is usually correct as-is; also set `env.APP_NAME` there (currently `"<TODO: app name, e.g. myapp>"`, used for the SSH deploy user/path).
- **SSH deploy secrets** — in repo settings, add `SSH_HOST`, `SSH_HOST_PRODUCTION`, and `SSH_KEY`, for hosts already provisioned via `aquarion/autopelago`.
- **Frontend OTEL CORS allow-list** (one-time, per project) — the OTLP ingest endpoint (`otlp.svc.istic.systems`) only accepts POSTs from allow-listed origins. Set `browser_otel: true` on the app's entry in `aquarion/autopelago`'s `host_vars/<host>/laravel_apps.yml` (staging inherits the flag from the parent app entry unless overridden). Without this, every browser error report fails silently — `reportError` never throws, by design, so there's no console signal that CORS is rejecting requests.
- Confirm `aquarion/autopelago` has provisioned the target staging/production host before the CI deploy jobs will succeed.

## Local development

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
`config('version')`. `config/version.php` also defines a `git_head_path` key
(the path to `.git/HEAD`, for internal/future use), but the route explicitly
excludes it from the public response — `routes/web.php` does
`collect(config('version'))->except('git_head_path')` — since it would leak the
server's absolute filesystem path.
