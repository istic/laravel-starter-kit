import { initOtelBrowserErrors } from '@istic-co/otel-browser-errors';

initOtelBrowserErrors({
    endpoint: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: `${import.meta.env.VITE_APP_NAME}-frontend`,
    serviceVersion: import.meta.env.VITE_APP_VERSION,
    environment: import.meta.env.VITE_APP_ENV,
    revision: import.meta.env.VITE_APP_PR_NUMBER,
    branch: import.meta.env.VITE_APP_BRANCH,
});

// If you add a router or auth layer, extend the config above with:
// getContext: () => ({ route: currentRoute, userId: currentUserId }),
