// sentry.client.config.ts

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  integrations: [
    Sentry.replayIntegration(),
  ],

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.1,

  debug: false,

  beforeSend(event) {
    // sensitive data remove karne ke liye
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});