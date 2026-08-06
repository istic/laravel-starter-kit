# Laravel Starter Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `istic/laravel-starter-kit` — a Laravel 13 app skeleton pre-wired with version exposure, OpenTelemetry (backend + frontend), a dev-only Cloudflare tunnel, Pest test config, and a full CI/CD + Dependabot pipeline, per `docs/superpowers/plans/2026-08-05-laravel-starter-kit-design.md`.

**Architecture:** Start from a stock `laravel/laravel` skeleton, then layer each spec component on top as its own task/commit: test tooling, version config, a production Dockerfile, OTEL backend, OTEL frontend wiring, the dev Cloudflare tunnel (via Laravel Sail + a `cloudflared` compose service), then the GitHub Actions CI/CD + Dependabot pipeline. Every ported file is adapted from `~/code/aquarion/bloom` and `~/code/istic/alchemistic` — verbatim where the source has no app-specific opinion (Octane, Inertia, Passport), rewritten where the kit's "no frontend framework" scope requires it.

**Tech Stack:** Laravel 13, PHP 8.4, Pest 4, Vite, Laravel Sail (local dev), PHP-FPM (production Docker image), OpenTelemetry (PHP ext + `open-telemetry/opentelemetry-auto-laravel`), `@istic-co/otel-browser-errors`, cloudflared, GitHub Actions.

---

## Before you start

This repo has no git history yet. Work happens directly on `main` for this repo (per explicit instruction — this is the template source repo itself, not a downstream consumer, so there's no "confusing default branches later" risk to guard against here). Commit after every task.

Verify tooling once, up front:

```bash
php -v          # expect PHP 8.4.x
composer -V     # expect Composer 2.x
node -v         # expect Node 20+ (22 recommended)
docker -v
```

---

### Task 1: Bootstrap the Laravel skeleton and git repo

**Files:**
- Create: entire `laravel/laravel` skeleton (composer.json, artisan, app/, config/, routes/, resources/, tests/, etc.)
- Create: `.git/` (repo init)

- [ ] **Step 1: Scaffold the Laravel app in place**

The working directory already contains `.claude/`, `.remember/`, and `docs/` — `composer create-project` refuses to run in a non-empty directory, so scaffold into a temp dir and move the contents in.

```bash
composer create-project laravel/laravel /tmp/laravel-starter-kit-scaffold --prefer-dist --no-interaction
shopt -s dotglob
mv /tmp/laravel-starter-kit-scaffold/* .
rmdir /tmp/laravel-starter-kit-scaffold
```

- [ ] **Step 2: Verify the skeleton is Laravel 13**

Run: `php artisan --version`
Expected: `Laravel Framework 13.x.x`

- [ ] **Step 3: Init git and commit the untouched skeleton**

```bash
git init
git branch -m main
```

Confirm `.gitignore` (shipped by the skeleton) excludes `.env`, `/vendor`, `/node_modules`, `/public/build`, `/public/hot` — open it and check, don't assume.

```bash
git add -A
git commit -m "chore: scaffold Laravel 13 skeleton via composer create-project"
```

- [ ] **Step 4: Confirm the app boots**

Run: `php artisan serve --port=8001 &` then `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8001` then `kill %1`
Expected: `200`

---

### Task 2: Pest test configuration (spec component 4)

**Files:**
- Modify: `composer.json`
- Modify: `phpunit.xml`
- Read (no change expected, verify only): `tests/Pest.php`, `tests/TestCase.php`

- [ ] **Step 1: Add `laravel/sail` as a dev dependency**

Sail is needed in Task 7 for the local dev Docker Compose stack (it's what alchemistic's `compose.yaml` is generated from). Pull it in now so `composer.json` only needs one review pass later.

```bash
composer require laravel/sail --dev --no-interaction
```

- [ ] **Step 2: Set composer scripts to match kit convention**

Open `composer.json`. Laravel's default skeleton ships a `"test"` script that clears config then calls `php artisan test`, and no `"lint"` script. Replace the `"scripts"` block with:

```json
"scripts": {
    "lint": ["pint --parallel"],
    "lint:check": ["pint --parallel --test"],
    "test": ["pest --parallel"],
    "post-autoload-dump": [
        "Illuminate\\Foundation\\ComposerScripts::postAutoloadDump",
        "@php artisan package:discover --ansi"
    ],
    "post-update-cmd": [
        "@php artisan vendor:publish --tag=laravel-assets --ansi --force"
    ],
    "post-root-package-install": [
        "@php -r \"file_exists('.env') || copy('.env.example', '.env');\""
    ],
    "post-create-project-cmd": [
        "@php artisan key:generate --ansi",
        "@php -r \"file_exists('database/database.sqlite') || touch('database/database.sqlite');\"",
        "@php artisan migrate --graceful --ansi"
    ]
}
```

(Keep whatever `post-*` hooks the skeleton already generated if they differ slightly — the ones above are Laravel 13's stock hooks, reproduced here so the file is complete and reviewable in one place. Diff against what's already there before overwriting.)

- [ ] **Step 3: Verify `tests/Pest.php` already binds `RefreshDatabase` to Feature tests**

Read `tests/Pest.php`. The stock Laravel 13 skeleton already ships:

```php
pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');
```

If it doesn't (skeleton drift), add it. No Dusk binding is needed — this kit has no browser-test requirement in scope.

- [ ] **Step 4: Replace `phpunit.xml` with the kit's test-env overrides**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
>
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory>app</directory>
        </include>
    </source>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="APP_KEY" value="base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="/>
        <env name="APP_MAINTENANCE_DRIVER" value="file"/>
        <env name="BCRYPT_ROUNDS" value="4"/>
        <env name="BROADCAST_CONNECTION" value="null"/>
        <env name="CACHE_STORE" value="array"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="DB_URL" value=""/>
        <env name="MAIL_MAILER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="SESSION_DRIVER" value="array"/>
    </php>
</phpunit>
```

- [ ] **Step 5: Run the test suite to confirm the new config works**

Run: `composer test`
Expected: PASS (stock skeleton has one passing example test)

- [ ] **Step 6: Run lint**

Run: `composer lint:check`
Expected: PASS (no files to fix, or pint auto-passes on the stock skeleton)

- [ ] **Step 7: Commit**

```bash
git add composer.json composer.lock phpunit.xml
git commit -m "test: configure Pint/Pest composer scripts and phpunit test env"
```

---

### Task 3: App version exposure (spec component 1)

**Files:**
- Create: `config/version.php`
- Create: `tests/Feature/VersionEndpointTest.php`
- Modify: `routes/web.php`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing test**

```php
<?php

use function Pest\Laravel\getJson;

it('exposes app version info as json', function () {
    config([
        'version.version' => '1.2.3',
        'version.pr_number' => '42',
        'version.branch' => 'main',
    ]);

    getJson('/version')
        ->assertOk()
        ->assertJson([
            'version' => '1.2.3',
            'pr_number' => '42',
            'branch' => 'main',
        ]);
});
```

Save as `tests/Feature/VersionEndpointTest.php`.

- [ ] **Step 2: Run test to verify it fails**

Run: `./vendor/bin/pest tests/Feature/VersionEndpointTest.php`
Expected: FAIL — route `/version` doesn't exist (404)

- [ ] **Step 3: Create `config/version.php`**

Ported verbatim from Bloom's `config/version.php` — falls back to `.git/HEAD` when the env vars are unset (useful for local dev where `APP_VERSION` isn't baked in):

```php
<?php

return [
    'version' => env('APP_VERSION'),
    'pr_number' => env('APP_PR_NUMBER'),
    'branch' => env('APP_BRANCH'),
    'git_head_path' => base_path('.git/HEAD'),
];
```

- [ ] **Step 4: Add the `/version` route**

Open `routes/web.php`. Add:

```php
Route::get('/version', function () {
    return response()->json(config('version'));
})->name('version');
```

- [ ] **Step 5: Run test to verify it passes**

Run: `./vendor/bin/pest tests/Feature/VersionEndpointTest.php`
Expected: PASS

- [ ] **Step 6: Add version env vars to `.env.example`**

Append to `.env.example`:

```
APP_VERSION=
APP_PR_NUMBER=
APP_BRANCH=
```

- [ ] **Step 7: Commit**

```bash
git add config/version.php routes/web.php tests/Feature/VersionEndpointTest.php .env.example
git commit -m "feat: add config/version.php and GET /version endpoint"
```

---

### Task 4: Production Dockerfile

**Files:**
- Create: `docker/production/Dockerfile`
- Create: `docker/production/php-opcache.ini`
- Create: `docker/production/entrypoint.sh`
- Create: `.dockerignore`

This is the base image build — PHP-FPM + Vite asset build, version ARGs and OCI labels wired in. OTEL-specific pieces (extension install, `OTEL_RESOURCE_ATTRIBUTES`, `VITE_OTEL_*` threading) are added in Tasks 5 and 6 as targeted edits to this same file, so the diff for "what OTEL adds" stays reviewable on its own.

- [ ] **Step 1: Write `.dockerignore`**

```
.git
.env
node_modules
vendor
storage/framework/cache/*
storage/framework/sessions/*
storage/framework/views/*
storage/logs/*
tests
docs
.claude
```

- [ ] **Step 2: Write `docker/production/php-opcache.ini`**

Ported verbatim from alchemistic:

```ini
opcache.enable=1
opcache.memory_consumption=256
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.save_comments=1
```

- [ ] **Step 3: Write `docker/production/entrypoint.sh`**

Adapted from alchemistic's production entrypoint — dropped the `passport:keys` step (Passport/OAuth-server is app-specific, out of scope for a generic kit), added `route:cache` (alchemistic's omits it; Bloom's includes it — route caching is safe for any Laravel app with only closures/controller routes, which is all this kit ships):

```sh
#!/bin/sh
set -e

if [ -z "${APP_KEY}" ]; then
    echo "[entrypoint] ERROR: APP_KEY is not set. Set it in your environment." >&2
    exit 1
fi

echo "[entrypoint] Creating storage directories..."
mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs storage/app/public

echo "[entrypoint] Caching config..."
php artisan config:cache || {
    echo "[entrypoint] ERROR: php artisan config:cache failed" >&2
    exit 1
}

echo "[entrypoint] Caching routes..."
php artisan route:cache || {
    echo "[entrypoint] ERROR: php artisan route:cache failed" >&2
    exit 1
}

echo "[entrypoint] Caching views..."
php artisan view:cache || {
    echo "[entrypoint] ERROR: php artisan view:cache failed" >&2
    exit 1
}

# Set RUN_MIGRATIONS=false on additional replicas to avoid concurrent migration attempts.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "[entrypoint] Running migrations..."
    php artisan migrate --force || {
        echo "[entrypoint] ERROR: php artisan migrate --force failed" >&2
        exit 1
    }
fi

exec "$@"
```

Make it executable: `chmod +x docker/production/entrypoint.sh`

- [ ] **Step 4: Write `docker/production/Dockerfile`**

Multi-stage: Node stage builds `node_modules` for the Vite asset build, PHP-FPM stage does everything else. Version ARGs/ENV/labels included now; OTEL lines are added as marked edits in Tasks 5–6.

```dockerfile
FROM node:22-alpine AS node-deps
WORKDIR /var/www/html
COPY package.json package-lock.json ./
RUN npm ci

FROM php:8.4-fpm-alpine

LABEL maintainer="<TODO: your name/team>"
LABEL description="<TODO: app name> production image"

RUN docker-php-ext-install pdo_mysql opcache bcmath

COPY docker/production/php-opcache.ini /usr/local/etc/php/conf.d/opcache.ini

WORKDIR /var/www/html

ARG APP_ENV=production
ARG APP_NAME=Laravel
ARG APP_VERSION=dev
ARG APP_PR_NUMBER=
ARG APP_BRANCH=

COPY --from=composer:2.9 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts --no-interaction

COPY --from=node-deps /var/www/html/node_modules node_modules
COPY . .

RUN VITE_APP_NAME=$APP_NAME VITE_APP_VERSION=$APP_VERSION VITE_APP_ENV=$APP_ENV VITE_APP_PR_NUMBER=$APP_PR_NUMBER VITE_APP_BRANCH=$APP_BRANCH npm run build \
    && rm -rf node_modules

RUN mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker/production/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV APP_VERSION=$APP_VERSION
ENV APP_PR_NUMBER=$APP_PR_NUMBER
ENV APP_BRANCH=$APP_BRANCH

LABEL org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_PR_NUMBER \
      org.opencontainers.image.ref.name=$APP_BRANCH

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["php-fpm"]
```

- [ ] **Step 5: Build the image to verify it compiles**

Run: `docker build -f docker/production/Dockerfile -t laravel-starter-kit:test .`
Expected: build succeeds (last line `naming to docker.io/library/laravel-starter-kit:test`)

- [ ] **Step 6: Commit**

```bash
git add docker/production/ .dockerignore
git commit -m "feat: add production Dockerfile (PHP-FPM + Vite asset build)"
```

---

### Task 5: OpenTelemetry — backend (spec component 2a)

**Files:**
- Modify: `composer.json`
- Modify: `docker/production/Dockerfile`
- Modify: `.env.example`

- [ ] **Step 1: Require the OTEL PHP packages**

```bash
composer require ext-opentelemetry:'*' open-telemetry/opentelemetry-auto-laravel --no-interaction
```

This pulls in `open-telemetry/sdk` and `open-telemetry/exporter-otlp` as transitive deps. `ext-opentelemetry` is a platform requirement (satisfied by the PHP extension installed in the Dockerfile below, and needs to be present on any dev machine running the app outside Docker too — note this in the README in Task 9).

- [ ] **Step 2: Install the extension in the Dockerfile**

Edit `docker/production/Dockerfile`. Add the extension installer and the `opentelemetry` extension right after the existing `docker-php-ext-install` line:

```dockerfile
COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/bin/install-php-extensions

RUN docker-php-ext-install pdo_mysql opcache bcmath \
    && install-php-extensions opentelemetry
```

(This replaces the plain `RUN docker-php-ext-install pdo_mysql opcache bcmath` line from Task 4 — same line, with the installer copy above it and `install-php-extensions opentelemetry` appended.)

- [ ] **Step 3: Set `OTEL_RESOURCE_ATTRIBUTES` in the Dockerfile**

**Use `deployment.environment`, not `service.environment`** — this is the documented fix from the design spec (§2a): Bloom's Dockerfile originally used `service.environment`, which gets silently overridden at container runtime by `aquarion/autopelago`'s `firth_laravel_app` Ansible role (its `docker-compose.yml.j2` template sets `OTEL_RESOURCE_ATTRIBUTES` using `deployment.environment`). Baking the same key in means the image's baked-in value only matters for manual/non-Ansible runs, but at least it's consistent with reality then too.

Add this ENV line right after the existing `ENV APP_BRANCH=$APP_BRANCH` line in the Dockerfile:

```dockerfile
ENV OTEL_RESOURCE_ATTRIBUTES="service.version=$APP_VERSION,deployment.environment=$APP_ENV,service.name=$APP_NAME,service.revision=$APP_PR_NUMBER,service.branch=$APP_BRANCH"
```

- [ ] **Step 4: No exporter config in-repo**

Do not add `OTEL_EXPORTER_OTLP_*` anywhere — per spec, these are supplied externally by the deploy target. Add a comment noting this to `.env.example`:

```
# OTEL_EXPORTER_OTLP_* vars are NOT set here — supplied externally by the deploy target (Ansible/host env).
```

- [ ] **Step 5: Verify composer install and Docker build still succeed**

Run: `composer validate --strict`
Expected: PASS

Run: `docker build -f docker/production/Dockerfile -t laravel-starter-kit:test .`
Expected: build succeeds, and `docker run --rm laravel-starter-kit:test env | grep OTEL_RESOURCE_ATTRIBUTES` (run with `--entrypoint sh -c 'env | grep OTEL'`) shows the composed string with `deployment.environment=production`

- [ ] **Step 6: Commit**

```bash
git add composer.json composer.lock docker/production/Dockerfile .env.example
git commit -m "feat: wire OpenTelemetry PHP auto-instrumentation (backend)"
```

---

### Task 6: OpenTelemetry — frontend browser errors (spec component 2b)

**Files:**
- Modify: `package.json`
- Modify: `resources/js/app.js`
- Modify: `.env.example`
- Modify: `docker/production/Dockerfile`
- Create: docs note in README (deferred content, written fully in Task 9 — this task just leaves a placeholder line)

- [ ] **Step 1: Install the package**

```bash
npm install @istic-co/otel-browser-errors@^0.2.1
```

Pin `^0.2.1` or later — `0.1.0`/`0.2.0` have a wrong resource-attribute key and drop spans on page reload.

- [ ] **Step 2: Wire init into the Vite entry point**

The stock Laravel 13 skeleton's frontend entry point is `resources/js/app.js`. Open it and add, at module scope, before any other app bootstrap code:

```js
import { initOtelBrowserErrors } from '@istic-co/otel-browser-errors';

initOtelBrowserErrors({
    endpoint: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: `${import.meta.env.VITE_APP_NAME}-frontend`,
    serviceVersion: import.meta.env.VITE_APP_VERSION,
    environment: import.meta.env.VITE_APP_ENV,
    revision: import.meta.env.VITE_APP_PR_NUMBER,
    branch: import.meta.env.VITE_APP_BRANCH,
});
```

Leave `getContext` out by default (commented example below it) since the kit has no router/auth opinion to source route/userId from:

```js
// If you add a router or auth layer, extend the config above with:
// getContext: () => ({ route: currentRoute, userId: currentUserId }),
```

`endpoint` falsy (unset in local dev) makes this a safe no-op.

- [ ] **Step 3: Add frontend env vars to `.env.example`**

Append:

```
VITE_APP_NAME="${APP_NAME}"
VITE_APP_VERSION="${APP_VERSION}"
VITE_APP_ENV="${APP_ENV}"
VITE_APP_PR_NUMBER="${APP_PR_NUMBER}"
VITE_APP_BRANCH="${APP_BRANCH}"
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=
```

Empty `VITE_OTEL_EXPORTER_OTLP_ENDPOINT` by default so local dev no-ops.

- [ ] **Step 4: Thread the OTEL endpoint ARG through the Dockerfile's Vite build**

Edit `docker/production/Dockerfile`. Add a new ARG next to the existing version ARGs:

```dockerfile
ARG VITE_OTEL_EXPORTER_OTLP_ENDPOINT=
```

And update the `npm run build` RUN line (from Task 4) to thread it through:

```dockerfile
RUN VITE_APP_NAME=$APP_NAME VITE_APP_VERSION=$APP_VERSION VITE_APP_ENV=$APP_ENV VITE_APP_PR_NUMBER=$APP_PR_NUMBER VITE_APP_BRANCH=$APP_BRANCH VITE_OTEL_EXPORTER_OTLP_ENDPOINT=$VITE_OTEL_EXPORTER_OTLP_ENDPOINT npm run build \
    && rm -rf node_modules
```

Skipping this ARG is the exact bug the design spec calls out (§2b) — Bloom shipped without it and the whole frontend telemetry pipeline silently no-op'd in every deployed environment until it was added.

- [ ] **Step 5: Verify the build picks up the var**

```bash
docker build -f docker/production/Dockerfile \
  --build-arg VITE_OTEL_EXPORTER_OTLP_ENDPOINT=https://example.test/v1/traces \
  -t laravel-starter-kit:test .
docker run --rm --entrypoint sh laravel-starter-kit:test -c "grep -l 'example.test' public/build/assets/*.js"
```

Expected: a built JS asset file path is printed (the endpoint got baked into the bundle)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json resources/js/app.js .env.example docker/production/Dockerfile
git commit -m "feat: wire @istic-co/otel-browser-errors into the Vite entry point"
```

(README documentation of the CORS allow-list step and CI build-arg happens in Task 9, once all pieces are in and the README is written in one pass.)

---

### Task 7: Argo Tunnel — local dev only (spec component 3)

**Files:**
- Create: `compose.yaml`, `docker/8.4/Dockerfile` and friends (via `sail:install`)
- Create: `docker/cloudflared/Dockerfile`
- Create: `docker/cloudflared/entrypoint.sh`
- Create: `docker/cloudflared/config.yml`
- Modify: `compose.yaml` (add `cloudflared` service)
- Modify: `.gitignore`

- [ ] **Step 1: Generate the Sail-based dev compose file**

```bash
php artisan sail:install --with=mysql,redis,mailpit --no-interaction
```

This creates `compose.yaml` and `docker/8.4/` (Sail's own Dockerfile/entrypoint for local dev — separate from the production image in `docker/production/`). Confirm `compose.yaml` was created with an `application` (or `laravel.test`) service before continuing — read it.

- [ ] **Step 2: Write `docker/cloudflared/Dockerfile`**

Ported verbatim from alchemistic:

```dockerfile
FROM cloudflare/cloudflared:latest AS cloudflared

FROM alpine:3.20

RUN apk add --no-cache bash curl grep sed coreutils

COPY --from=cloudflared /usr/local/bin/cloudflared /usr/local/bin/cloudflared

WORKDIR /var/www/html

ENTRYPOINT ["/var/www/html/docker/cloudflared/entrypoint.sh"]
```

- [ ] **Step 3: Write `docker/cloudflared/entrypoint.sh`**

Ported verbatim from alchemistic, with the service name generalized from `application` (alchemistic-specific) to match whatever `sail:install` named the app service in Step 1 — **check the actual service name in `compose.yaml` before writing this** and use it consistently in both this file and the compose block in Step 5:

```bash
#!/bin/bash
set -euo pipefail

# Detect if running in Docker
if [[ -f /.dockerenv ]] || [[ -n "${DOCKER:-}" ]]; then
    IN_DOCKER=true
    WORKDIR="/var/www/html"
    echo "[cloudflared] Running in Docker container"
else
    IN_DOCKER=false
    WORKDIR="."
    echo "[cloudflared] Running standalone"
fi

# Load environment variables
if [[ -f "${WORKDIR}/.env" ]]; then
    source "${WORKDIR}/.env"
else
    echo "[cloudflared] WARNING: ${WORKDIR}/.env not found; using default APP_PORT=80"
fi

if [[ -z "${APP_PORT:-}" ]]; then
    export APP_PORT=80
fi

# If in Docker, wait for the main app to be ready
if [[ "$IN_DOCKER" == true ]]; then
    echo "[cloudflared] Waiting for application to be ready on http://laravel.test:${APP_PORT}..."
    MAX_ATTEMPTS=60 # ~2 minutes at 2s intervals
    attempt=0
    until curl -sS -f "http://laravel.test:${APP_PORT}" > /tmp/cloudflared-health.log 2>&1; do
        attempt=$((attempt + 1))
        if [[ "$attempt" -ge "$MAX_ATTEMPTS" ]]; then
            echo "[cloudflared] ERROR: application did not become ready after ${MAX_ATTEMPTS} attempts." >&2
            echo "[cloudflared] Last curl output:" >&2
            cat /tmp/cloudflared-health.log >&2
            echo "[cloudflared] Check 'docker compose logs laravel.test' for the root cause." >&2
            exit 1
        fi
        echo "[cloudflared] Waiting for app... (attempt ${attempt}/${MAX_ATTEMPTS})"
        sleep 2
    done
    echo "[cloudflared] App is ready!"
fi

# Named tunnel: hostnames -> origins are fixed in docker/cloudflared/config.yml
# (created via `cloudflared tunnel create` + `tunnel route dns`), so there's
# no URL discovery to do here, unlike ngrok/quick tunnels.
echo "[cloudflared] Starting named tunnel..."
exec cloudflared tunnel --config "${WORKDIR}/docker/cloudflared/config.yml" run
```

**Note:** `laravel.test` above is Sail's default service name — if Step 1's `compose.yaml` named it `application` or something else instead, replace both occurrences of `laravel.test` in this file accordingly.

- [ ] **Step 4: Write `docker/cloudflared/config.yml` as a placeholder template**

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /root/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: <app>.istic.dev
    service: http://laravel.test:80
  - hostname: vite-<app>.istic.dev
    service: http://laravel.test:5173
  - service: http_status:404
```

(Match the service name to whatever's actually in `compose.yaml`, same caveat as Step 3.)

- [ ] **Step 5: Add the `cloudflared` service to `compose.yaml`**

Open `compose.yaml` (from `sail:install`) and add a new service, matching alchemistic's wiring:

```yaml
  cloudflared:
    build:
      context: "./docker/cloudflared"
      dockerfile: Dockerfile
    image: "sail-cloudflared/app"
    environment:
      DOCKER: "true"
    volumes:
      - ".:/var/www/html"
      - "./docker/cloudflared/data:/root/.cloudflared"
    networks:
      - sail
    depends_on:
      - laravel.test
```

(Use the real app-service name from Step 1 in `depends_on`, and confirm the network name Sail generated — it's usually `sail` but verify against the file rather than assuming.)

- [ ] **Step 6: Gitignore the tunnel credentials directory**

Append to `.gitignore`:

```
/docker/cloudflared/data
```

- [ ] **Step 7: Verify the compose file is syntactically valid**

Run: `docker compose config --quiet`
Expected: no output, exit code 0

- [ ] **Step 8: Commit**

```bash
git add compose.yaml docker/8.4 docker/cloudflared .gitignore
git commit -m "feat: add Sail dev stack and dev-only Cloudflare tunnel"
```

(One-time per-project setup instructions — `cloudflared tunnel create`, `tunnel route dns`, filling in the real UUID — go in the README in Task 9.)

---

### Task 8: CI/CD + Dependabot (spec component 5)

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/workflows/dependabot-auto-merge.yml`
- Create: `.github/workflows/auto-rebase-dependabot.yml`
- Create: `.github/workflows/dependabot-make-release.yml`
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

Adapted from Bloom's — dropped the `npx vitest run` frontend-test step (Bloom-specific, no framework/test-runner opinion in this kit), dropped Dusk comment, generalized `APP_NAME`, parameterized deploy hosts as secrets instead of hardcoding (per spec: "a new project only needs to set its own SSH host/key secrets"):

```yaml
name: CI

on:
  push:
    branches: [dependabot-updates]
  pull_request:
    branches: ["**"]
    types: [opened, synchronize, reopened, edited]
  workflow_dispatch:
  workflow_call:
    inputs:
      tag:
        description: "Release tag to build and deploy"
        type: string
        required: true

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  APP_NAME: "<TODO: app name, e.g. myapp>"

jobs:
  test:
    runs-on: ubuntu-latest
    # 'edited' also fires for title/body-only edits, not just base-branch
    # retargets — skip those so an unrelated description tweak doesn't
    # trigger a full test + build-and-push + deploy-staging run.
    if: github.event.action != 'edited' || github.event.changes.base != null
    permissions:
      contents: read

    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: "8.4"
          tools: composer:v2
          extensions: opentelemetry

      - name: Setup Node
        uses: actions/setup-node@v7
        with:
          node-version: "22"

      - name: Install Node dependencies
        run: npm ci

      - name: Install PHP dependencies
        run: composer install --no-interaction --prefer-dist --optimize-autoloader

      - name: Copy environment file
        run: cp .env.example .env

      - name: Generate application key
        run: php artisan key:generate

      - name: Run migrations
        run: php artisan migrate --force

      - name: Build assets
        run: npm run build

      - name: Lint
        run: composer lint:check

      - name: Run tests
        run: composer test

  build-and-push:
    needs: [test]
    runs-on: ubuntu-latest
    if: |
      github.ref != 'refs/heads/dependabot-updates' &&
      (github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository)
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v7
        with:
          ref: ${{ inputs.tag || github.ref }}

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v4
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v6
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}},value=${{ inputs.tag || github.ref_name }},enable=${{ inputs.tag != '' || startsWith(github.ref, 'refs/tags/v') }}
            type=semver,pattern={{major}}.{{minor}},value=${{ inputs.tag || github.ref_name }},enable=${{ inputs.tag != '' || startsWith(github.ref, 'refs/tags/v') }}
            type=sha
            type=raw,value=latest,enable=${{ inputs.tag != '' || startsWith(github.ref, 'refs/tags/v') }}
            type=raw,value=staging,enable=${{ github.event_name == 'pull_request' }}
          labels: |
            org.opencontainers.image.description=${{ github.event_name == 'pull_request' && format('Staging build for PR #{0}: {1}', github.event.pull_request.number, github.event.pull_request.html_url) || format('Production build {0}', inputs.tag || github.ref_name) }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v4

      - name: Build and push
        uses: docker/build-push-action@v7
        with:
          context: .
          file: docker/production/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            APP_VERSION=${{ inputs.tag || github.ref_name }}
            APP_PR_NUMBER=${{ github.event.pull_request.number }}
            APP_BRANCH=${{ github.head_ref }}
            APP_ENV=${{ github.event_name == 'pull_request' && 'staging' || 'production' }}
            VITE_OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.svc.istic.systems/v1/traces

  deploy-staging:
    needs: build-and-push
    if: github.event_name == 'pull_request' && github.actor != 'dependabot[bot]'
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-staging
      cancel-in-progress: true
    permissions:
      contents: read

    steps:
      - name: Deploy staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ env.APP_NAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            set -euo pipefail
            cd /home/docker/${{ env.APP_NAME }}-staging
            timeout 300 docker compose pull || {
              echo "ERROR: docker compose pull failed or timed out after 300s"
              exit 1
            }
            docker compose up -d || {
              echo "ERROR: docker compose up -d failed"
              docker compose ps
              docker compose logs --tail=50
              exit 1
            }
            for i in $(seq 1 30); do
              if docker compose exec -T app php artisan --version > /dev/null 2>&1; then
                echo "Container ready after ${i} attempt(s)"
                break
              fi
              if [ "$i" -eq 30 ]; then
                echo "ERROR: Container failed to become ready after 30 attempts"
                docker compose exec -T app php artisan --version || true
                docker compose logs --tail=50 app
                exit 1
              fi
              echo "Attempt ${i}/30: container not ready, waiting..."
              sleep 2
            done
            docker compose exec -T app test -d /var/www/html/public/build/assets || {
              echo "ERROR: /var/www/html/public/build/assets not found in container, aborting asset copy"
              exit 1
            }
            rm -rf public/build/assets && mkdir -p public/build && docker compose cp app:/var/www/html/public/build/assets public/build/
            docker compose exec -T app php artisan migrate --force || {
              echo "ERROR: Migration failed"
              docker compose exec -T app php artisan migrate:status || true
              exit 1
            }

  deploy-production:
    needs: build-and-push
    if: inputs.tag != ''
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    permissions:
      contents: read

    steps:
      - name: Deploy production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST_PRODUCTION }}
          username: ${{ env.APP_NAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            set -euo pipefail
            cd /home/docker/${{ env.APP_NAME }}
            timeout 300 docker compose pull || {
              echo "ERROR: docker compose pull failed or timed out after 300s"
              exit 1
            }
            docker compose up -d || {
              echo "ERROR: docker compose up -d failed"
              docker compose ps
              docker compose logs --tail=50
              exit 1
            }
            for i in $(seq 1 30); do
              if docker compose exec -T app php artisan --version > /dev/null 2>&1; then
                echo "Container ready after ${i} attempt(s)"
                break
              fi
              if [ "$i" -eq 30 ]; then
                echo "ERROR: Container failed to become ready after 30 attempts"
                docker compose exec -T app php artisan --version || true
                docker compose logs --tail=50 app
                exit 1
              fi
              echo "Attempt ${i}/30: container not ready, waiting..."
              sleep 2
            done
            docker compose exec -T app test -d /var/www/html/public/build/assets || {
              echo "ERROR: /var/www/html/public/build/assets not found in container, aborting asset copy"
              exit 1
            }
            rm -rf public/build/assets && mkdir -p public/build && docker compose cp app:/var/www/html/public/build/assets public/build/
            docker compose exec -T app php artisan migrate --force || {
              echo "ERROR: Migration failed"
              docker compose exec -T app php artisan migrate:status || true
              exit 1
            }
```

- [ ] **Step 2: Write `.github/workflows/release.yml`**

Ported verbatim from Bloom — already generic, no app-specific content:

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      version_bump:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major
  workflow_call:
    inputs:
      version_bump:
        type: string
        description: 'Version bump type'
        required: true

jobs:
  tag:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    outputs:
      next_version: ${{ steps.next_version.outputs.next_version }}

    steps:
      - name: Checkout repository
        uses: actions/checkout@v7
        with:
          fetch-depth: 0
          ref: main

      - name: Get latest tag
        id: get_tag
        run: |
          set -euo pipefail
          LATEST_TAG=$(git tag -l "v*.*.*" | sort -V | tail -n 1)
          if [ -z "$LATEST_TAG" ]; then
            LATEST_TAG="v0.0.0"
            echo "No existing tags found, starting from $LATEST_TAG"
          else
            echo "Latest tag: $LATEST_TAG"
          fi
          echo "latest_tag=$LATEST_TAG" >> "$GITHUB_OUTPUT"

      - name: Calculate next version
        id: next_version
        env:
          LATEST_TAG: ${{ steps.get_tag.outputs.latest_tag }}
          VERSION_BUMP: ${{ inputs.version_bump }}
        run: |
          set -euo pipefail
          VERSION=${LATEST_TAG#v}

          IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

          case "$VERSION_BUMP" in
            major)
              MAJOR=$((MAJOR + 1))
              MINOR=0
              PATCH=0
              ;;
            minor)
              MINOR=$((MINOR + 1))
              PATCH=0
              ;;
            patch)
              PATCH=$((PATCH + 1))
              ;;
            *)
              echo "Invalid version_bump value: $VERSION_BUMP"
              exit 1
              ;;
          esac

          NEXT_VERSION="v${MAJOR}.${MINOR}.${PATCH}"
          echo "Next version: $NEXT_VERSION"
          echo "next_version=$NEXT_VERSION" >> "$GITHUB_OUTPUT"

      - name: Create and push tag
        env:
          NEXT_VERSION: ${{ steps.next_version.outputs.next_version }}
        run: |
          set -euo pipefail
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          LS_REMOTE_OUTPUT=$(git ls-remote --tags origin "$NEXT_VERSION")
          if echo "$LS_REMOTE_OUTPUT" | grep -qF "refs/tags/$NEXT_VERSION"; then
            echo "ERROR: Tag $NEXT_VERSION already exists on remote."
            echo "A previous run may have pushed the tag but failed before creating the GitHub Release."
            echo "Recovery options:"
            echo "  1. If the GitHub Release is missing: create it manually at https://github.com/${GITHUB_REPOSITORY}/releases/new?tag=${NEXT_VERSION}"
            echo "  2. If you want to re-run: delete the remote tag with: git push origin :refs/tags/${NEXT_VERSION}"
            exit 1
          fi

          git tag -a "$NEXT_VERSION" -m "Release $NEXT_VERSION"
          git push origin "$NEXT_VERSION"

          echo "✅ Created and pushed tag: $NEXT_VERSION"

      - name: Generate release notes
        id: release_notes
        env:
          LATEST_TAG: ${{ steps.get_tag.outputs.latest_tag }}
          NEXT_VERSION: ${{ steps.next_version.outputs.next_version }}
          REPOSITORY: ${{ github.repository }}
        run: |
          set -euo pipefail
          if [ "$LATEST_TAG" == "v0.0.0" ]; then
            COMMITS=$(git log --pretty=format:"- %s (%h)" --no-merges)
          else
            if ! git rev-parse --verify "$LATEST_TAG" > /dev/null 2>&1; then
              echo "ERROR: Tag $LATEST_TAG not found in local history"
              exit 1
            fi
            COMMITS=$(git log "${LATEST_TAG}..HEAD" --pretty=format:"- %s (%h)" --no-merges)
          fi
          [ -z "$COMMITS" ] && COMMITS="No notable changes."

          TAG_SUFFIX="${NEXT_VERSION#v}"

          {
            printf '## What'\''s Changed\n\n'
            printf '%s\n' "${COMMITS}"
            printf '\n## Docker Image\n\n'
            printf '```bash\n'
            printf 'docker pull ghcr.io/%s:%s\n' "${REPOSITORY}" "${TAG_SUFFIX}"
            printf 'docker pull ghcr.io/%s:latest\n' "${REPOSITORY}"
            printf '```\n\n'
            printf '**Full Changelog**: https://github.com/%s/compare/%s...%s\n' \
              "${REPOSITORY}" "${LATEST_TAG}" "${NEXT_VERSION}"
          } > release_notes.md

          echo "Release notes generated"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ steps.next_version.outputs.next_version }}
          name: Release ${{ steps.next_version.outputs.next_version }}
          body_path: release_notes.md
          draft: false
          prerelease: false

  ci:
    needs: tag
    uses: ./.github/workflows/ci.yml
    permissions:
      contents: read
      packages: write
    with:
      tag: ${{ needs.tag.outputs.next_version }}
    # Pass caller secrets into the reusable workflow (required for SSH_KEY, GITHUB_TOKEN, etc.)
    secrets: inherit # pragma: allowlist secret
```

- [ ] **Step 3: Write `.github/workflows/dependabot-auto-merge.yml`**

Ported verbatim:

```yaml
name: "[Auto] Merge Dependabot Updates"

on:
  pull_request:
    branches: [dependabot-updates]

permissions: {}

jobs:
  automerge:
    if: github.actor == 'dependabot[bot]'
    uses: istic/shared-workflows/.github/workflows/auto-merge-dependabot.yml@main
    permissions:
      pull-requests: write
      contents: write
```

- [ ] **Step 4: Write `.github/workflows/auto-rebase-dependabot.yml`**

Ported verbatim:

```yaml
name: "[Auto] Rebase dependabot-updates onto main"

on:
  schedule:
    - cron: "0 1 * * *"
  workflow_dispatch:

permissions: {}

jobs:
  rebase:
    uses: istic/shared-workflows/.github/workflows/auto-rebase-dependabot.yml@main
    permissions:
      contents: write
      pull-requests: write
    secrets:
      REBASE_TOKEN: ${{ secrets.REBASE_TOKEN }}
```

- [ ] **Step 5: Write `.github/workflows/dependabot-make-release.yml`**

Adapted from Bloom's — **fixed a copy-paste bug**: Bloom's own copy of this workflow calls `uses: aquarion/bloom/.github/workflows/release.yml@main` (an external reference to its own repo, which happens to work because that repo *is* `aquarion/bloom`, but is wrong as a *template* — every downstream project instantiated from this kit needs to call its own `release.yml`, not `istic/laravel-starter-kit`'s). Use a local `uses: ./...` reference instead:

```yaml
name: "[Dependabot] Make Release"

on:
  schedule:
    - cron: "0 3 * * 1" # Monday 3am UTC
  workflow_dispatch:
    inputs:
      merge_dependabot:
        description: "Merge dependabot-updates into main first"
        required: false
        default: true
        type: boolean
      version_bump:
        description: "Version bump type"
        required: true
        default: "patch"
        type: choice
        options:
          - patch
          - minor
          - major

permissions: {}

jobs:
  check-for-updates:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    outputs:
      has_updates: ${{ steps.check.outputs.has_updates }}
      version_bump: ${{ steps.params.outputs.version_bump }}

    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Resolve parameters
        id: params
        env:
          EVENT_NAME: ${{ github.event_name }}
          INPUT_VERSION_BUMP: ${{ inputs.version_bump }}
        run: |
          if [ "$EVENT_NAME" = "schedule" ]; then
            echo "version_bump=patch" >> "$GITHUB_OUTPUT"
          else
            echo "version_bump=$INPUT_VERSION_BUMP" >> "$GITHUB_OUTPUT"
          fi

      - name: Check if dependabot-updates is ahead of main
        id: check
        run: |
          git fetch origin
          if ! git ls-remote --exit-code origin dependabot-updates > /dev/null 2>&1; then
            echo "dependabot-updates branch does not exist, skipping release"
            echo "has_updates=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          AHEAD=$(git rev-list --count origin/main..origin/dependabot-updates)
          echo "dependabot-updates is $AHEAD commits ahead of main"
          if [ "$AHEAD" -gt 0 ]; then
            echo "has_updates=true" >> "$GITHUB_OUTPUT"
          else
            echo "No new commits in dependabot-updates, skipping release"
            echo "has_updates=false" >> "$GITHUB_OUTPUT"
          fi

  merge-dependabot:
    needs: check-for-updates
    if: |
      needs.check-for-updates.outputs.has_updates == 'true' &&
      (github.event_name == 'schedule' || inputs.merge_dependabot == true)
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      checks: read

    steps:
      - name: Merge dependabot-updates PR into main
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPO: ${{ github.repository }}
        run: |
          PR_STATE=$(gh pr view dependabot-updates --json state --jq '.state' 2>/dev/null || echo "NOT_FOUND")
          if [ "$PR_STATE" != "OPEN" ]; then
            echo "No open PR for dependabot-updates (state: $PR_STATE), creating one..."
            gh pr create --base main --head dependabot-updates \
              --title "chore: bump dependencies" \
              --body "Automated dependency updates"
          fi
          PR_IS_DRAFT=$(gh pr view dependabot-updates --json isDraft --jq '.isDraft' 2>/dev/null || echo "false")
          if [ "$PR_IS_DRAFT" = "true" ]; then
            gh pr ready dependabot-updates
          fi
          gh pr checks dependabot-updates --watch --fail-fast
          gh pr merge dependabot-updates --merge

  create-release:
    needs: [check-for-updates, merge-dependabot]
    if: |
      !failure() && !cancelled() &&
      (github.event_name == 'workflow_dispatch' || needs.check-for-updates.outputs.has_updates == 'true')
    permissions:
      contents: write
      packages: write
    uses: ./.github/workflows/release.yml
    with:
      version_bump: ${{ needs.check-for-updates.outputs.version_bump }}
    secrets: inherit # pragma: allowlist secret
```

- [ ] **Step 6: Write `.github/dependabot.yml`**

Ported verbatim:

```yaml
version: 2
updates:
  - package-ecosystem: "composer"
    directory: "/"
    schedule:
      interval: "weekly"
    target-branch: "dependabot-updates"
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    target-branch: "dependabot-updates"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    target-branch: "dependabot-updates"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    target-branch: "dependabot-updates"
```

- [ ] **Step 7: Validate all workflow YAML parses**

Run: `for f in .github/workflows/*.yml .github/dependabot.yml; do python3 -c "import yaml,sys; yaml.safe_load(open(sys.argv[1]))" "$f" || echo "INVALID: $f"; done`
Expected: no `INVALID` lines printed

(If `python3`/`pyyaml` isn't available, `yamllint .github/workflows/ .github/dependabot.yml` or GitHub's own `act -n` dry-run are acceptable substitutes — the point is confirming YAML syntax, not exercising the jobs.)

- [ ] **Step 8: Commit**

```bash
git add .github/
git commit -m "feat: add CI/CD, release, and Dependabot automation workflows"
```

---

### Task 9: README — setup flow and placeholders (spec "Setup flow for a new project")

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the stock Laravel README with kit-specific setup docs**

The `laravel/laravel` skeleton ships a generic upstream README. Replace it with:

```markdown
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

## Placeholders to fill in after `create-project`

- **App name** — set `APP_NAME` in `.env` (feeds `OTEL_RESOURCE_ATTRIBUTES` and Docker image labels via `docker/production/Dockerfile`'s `ARG APP_NAME`).
- **`docker/cloudflared/config.yml`** — replace `<TUNNEL_UUID>` and `<app>` with a real tunnel, after running (one-time, per project):

  ```sh
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel login
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel create <app>
  docker compose run --rm --no-deps --entrypoint cloudflared cloudflared tunnel route dns <app> <app>.istic.dev
  ```

  Then fill in the real tunnel UUID, credentials filename, and hostnames in `docker/cloudflared/config.yml`.
- **GHCR image name** — `.github/workflows/ci.yml`'s `env.IMAGE_NAME` defaults to `${{ github.repository }}`, which is usually correct as-is; also set `env.APP_NAME` there (used for the SSH deploy user/path).
- **SSH deploy secrets** — in repo settings, add `SSH_HOST`, `SSH_HOST_PRODUCTION`, and `SSH_KEY`, for hosts already provisioned via `aquarion/autopelago`.
- **Frontend OTEL CORS allow-list** (one-time, per project) — the OTLP ingest endpoint (`otlp.svc.istic.systems`) only accepts POSTs from allow-listed origins. Set `browser_otel: true` on the app's entry in `aquarion/autopelago`'s `host_vars/<host>/laravel_apps.yml` (staging inherits the flag from the parent app entry unless overridden). Without this, every browser error report fails silently — `reportError` never throws, by design, so there's no console signal that CORS is rejecting requests.
- Confirm `aquarion/autopelago` has provisioned the target staging/production host before the CI deploy jobs will succeed.

## Local development

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

`GET /version` returns `{"version", "pr_number", "branch", "git_head_path"}` from `config('version')`, sourced from `APP_VERSION`/`APP_PR_NUMBER`/`APP_BRANCH` env vars (falls back to reading `.git/HEAD` when unset).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add starter-kit setup flow and placeholder checklist to README"
```

---

### Task 10: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full local test run**

```bash
composer lint:check
composer test
```

Expected: both PASS

- [ ] **Step 2: `composer create-project` smoke test against this repo**

This validates the kit is actually consumable the way the spec's "Testing the starter kit itself" section requires. Since the repo has no remote yet, test against the local path instead of a VCS URL:

```bash
rm -rf /tmp/test-app
composer create-project /home/aquarion/code/istic/istic-laravel-starterkit /tmp/test-app --repository='{"type":"path","url":"/home/aquarion/code/istic/istic-laravel-starterkit","options":{"symlink":false}}' --no-interaction
cd /tmp/test-app && cp .env.example .env && php artisan key:generate && php artisan test
cd /home/aquarion/code/istic/istic-laravel-starterkit
```

Expected: `php artisan test` in `/tmp/test-app` passes. (This is a local proxy for the real flow — once the repo is pushed to `istic/laravel-starter-kit` on GitHub and Packagist/a VCS repository is configured, re-run this with the real `composer create-project istic/laravel-starter-kit <app-name>` per the spec.)

- [ ] **Step 3: `docker compose up` smoke test**

```bash
cp .env.example .env
php artisan key:generate
docker compose up -d --build
sleep 5
docker compose ps
```

Expected: `application`/`laravel.test`, database, redis, mailpit, and `cloudflared` containers all show `Up` (cloudflared may exit/restart-loop without a real tunnel UUID filled in — that's expected and documented as manual/deferred in the README; everything else must be healthy).

```bash
docker compose down
```

- [ ] **Step 4: Production Docker image smoke test**

```bash
docker build -f docker/production/Dockerfile -t laravel-starter-kit:smoke \
  --build-arg APP_VERSION=v0.0.0-smoke \
  --build-arg APP_NAME=SmokeTest \
  .
docker run --rm --entrypoint sh laravel-starter-kit:smoke -c 'php -m | grep -i otel'
```

Expected: `opentelemetry` printed (extension installed correctly)

- [ ] **Step 5: Final review commit (if any cleanup needed)**

If steps 2–4 surfaced any fixes, commit them individually with descriptive messages rather than amending prior task commits.

- [ ] **Step 6: Confirm full git log tells a clean story**

Run: `git log --oneline`
Expected: one commit per task (1 through 9), all with clear conventional-commit-style messages, on `main`.
