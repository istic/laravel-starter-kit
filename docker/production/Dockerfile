FROM node:22-alpine AS node-deps
WORKDIR /var/www/html
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG APP_ENV=production
ARG APP_NAME=Laravel
ARG APP_VERSION=dev
ARG APP_PR_NUMBER=
ARG APP_BRANCH=
ARG VITE_OTEL_EXPORTER_OTLP_ENDPOINT=

RUN VITE_APP_NAME=$APP_NAME VITE_APP_VERSION=$APP_VERSION VITE_APP_ENV=$APP_ENV VITE_APP_PR_NUMBER=$APP_PR_NUMBER VITE_APP_BRANCH=$APP_BRANCH VITE_OTEL_EXPORTER_OTLP_ENDPOINT=$VITE_OTEL_EXPORTER_OTLP_ENDPOINT npm run build

FROM php:8.5-fpm-alpine

LABEL maintainer="<TODO: your name/team>"
LABEL description="<TODO: app name> production image"

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/bin/install-php-extensions

RUN docker-php-ext-install pdo_mysql opcache bcmath \
    && install-php-extensions opentelemetry redis

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

COPY . .
COPY --from=node-deps /var/www/html/public/build public/build

RUN mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker/production/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV APP_VERSION=$APP_VERSION
ENV APP_PR_NUMBER=$APP_PR_NUMBER
ENV APP_BRANCH=$APP_BRANCH
ENV OTEL_RESOURCE_ATTRIBUTES="service.version=$APP_VERSION,deployment.environment=$APP_ENV,service.name=$APP_NAME,service.revision=$APP_PR_NUMBER,service.branch=$APP_BRANCH"
ENV OTEL_PHP_AUTOLOAD_ENABLED=true

LABEL org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_PR_NUMBER \
      org.opencontainers.image.ref.name=$APP_BRANCH

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["php-fpm"]
