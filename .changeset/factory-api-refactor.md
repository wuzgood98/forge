---
"@g14o/utils": minor
"@g14o/cache": minor
"@g14o/ratelimit": minor
---

Add `createCache()` and `createRateLimit()` factory APIs accepting `redis: { url, token }` or a pre-built Redis client. Bundle `@upstash/redis` as a dependency. Deprecate global `configureUtils` and top-level `withCache` / `withRateLimit` (removal planned in v0.3.0).
