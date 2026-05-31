# @g14o/cache

Cache middleware for Next.js: in-memory in development/test, Upstash Redis in production.

## Install

```bash
pnpm add @g14o/cache @g14o/utils
```

Optional: `@upstash/redis` if you pass `Redis.fromEnv()` instead of `{ url, token }`.

## Setup

Create `lib/cache.ts` once, then import bound helpers from there.

**URL + token (recommended):**

```ts
// lib/cache.ts
import { createCache } from "@g14o/cache";
import { logger } from "@/lib/logger";

export const { withCache, invalidateCache, invalidateCacheKey } = createCache({
  redis: {
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  },
  logger,
});
```

**Existing Redis client:**

```ts
import { Redis } from "@upstash/redis";
import { createCache } from "@g14o/cache";

export const { withCache } = createCache({
  redis: Redis.fromEnv(),
  logger,
});
```

## Usage

```ts
import { withCache, invalidateCache } from "@/lib/cache";
import type { Result } from "@g14o/utils/types";

async function getUsers(): Promise<Result<User[], Error>> {
  // ...
}

export const getUsersCached = withCache(getUsers, {
  ttl: "medium",
  prefix: "users",
});
```

In `development` / `test`, omit `redis` or set `env: "test"` to use an in-memory store.

See [@g14o/utils](../utils/README.md) for publishing and integration tests.
