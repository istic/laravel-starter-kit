FROM node:22-alpine AS node-deps
WORKDIR /var/www/html
COPY package.json package-lock.json ./
RUN npm ci

FROM php:8.4-fpm-alpine

LABEL maintainer="<TODO: your name/team>"
LABEL description="<TODO: app name> production image"

RUN docker-php-ext-install pdo_mysql opcache bcmath

# Node/npm are needed transiently to run the Vite asset build below; the
# node-deps stage only provides node_modules, not the npm binary itself.
RUN apk add --no-cache nodejs npm

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
    && rm -rf node_modules \
    && apk del nodejs npm

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
