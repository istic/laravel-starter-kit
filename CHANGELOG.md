# Changelog

Notable changes to the starter kit, newest first. Add an entry under
**Unreleased** with every change worth knowing about when updating a project
built from the kit; group entries as Added / Changed / Fixed.

The kit has no tagged releases yet, so earlier entries are grouped by date.

## Unreleased

### Added

- Matomo analytics: `App\Services\MatomoService` finds or creates the Matomo
  site for `APP_URL`, ensures goals from `config('services.matomo.goals')`
  exist, and caches the result. Enabled by `MATOMO_URL` and
  `MATOMO_AUTH_TOKEN`. The tracker renders via `@include('partials.matomo')`,
  with `trackPageView` / `trackEvent` / `trackGoal` helpers in
  `resources/js/matomo.js`. API calls time out after 2s connect / 5s total,
  and failed lookups are cached for five minutes.
- This changelog.

## 2026-10-29

### Added

- Favicons and app icons generated with `@istic-co/annealer` (#37).

### Changed

- Dependabot dependency updates (#16).
- README: Cloudflare tunnel certificate zone-scoping and Vite mixed-content
  gotchas.

## 2026-09-19

### Added

- Auto-merge and release for Dependabot PRs that target `main` (#15).

## 2026-08-11

### Added

- `DEPLOY_NOOP` repo variable, so CI can pass without a real deploy target (#3).
- PHPStan (Larastan) and Biome checks (#2).
- Lockfiles regenerate automatically when `dependabot-updates` merges into
  `main`.

### Changed

- Sessions default to Redis (#2).

## 2026-08-10

### Added

- Default pre-commit config: Pint, Composer validate, actionlint,
  detect-secrets, graphify.

### Fixed

- CI concurrency-group regression.
- `PHP_EXTENSIONS` is passed through to the Sail build.
- README quickstart and Getting started instructions.

## 2026-08-07

### Fixed

- Code-review findings: a credential leak, CI and Dependabot bugs, and silent
  failures.
- `APP_NAME` is passed to the Docker build so CI-built images report the right
  OTEL `service.name`.

## 2026-08-06

Initial kit, scaffolded from Laravel 13.

### Added

- `GET /version` endpoint backed by `config/version.php`.
- Production Dockerfile (PHP-FPM, with the Vite build in a Node stage).
- OpenTelemetry: PHP auto-instrumentation on the backend, and
  `@istic-co/otel-browser-errors` in the Vite entry point.
- Sail dev stack (PHP 8.4, matching production) and a dev-only Cloudflare
  tunnel.
- CI/CD, release and Dependabot workflows, with default-deny `permissions`.
- Pest tests, with Pint and Pest Composer scripts.
- Kit setup README.
