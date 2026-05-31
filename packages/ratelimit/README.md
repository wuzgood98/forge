# @g14o/ratelimit

Rate limiting for Next.js API routes: in-memory in development/test, Upstash Redis in production.

## Install

```bash
pnpm add @g14o/ratelimit @g14o/utils
```

Optional: `@upstash/redis` if you pass `Redis.fromEnv()` instead of `{ url, token }`.

## Setup

Create `lib/rate-limit.ts` once, then import bound helpers from there.

**URL + token (recommended):**

```ts
// lib/rate-limit.ts
import { createRateLimit } from "@g14o/ratelimit";
import { logger } from "@/lib/logger";

export const {
  withRateLimit,
  withUserRateLimit,
  checkRateLimit,
} = createRateLimit({
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
import { createRateLimit } from "@g14o/ratelimit";

export const { withRateLimit } = createRateLimit({
  redis: Redis.fromEnv(),
  logger,
});
```

## Usage

```ts
import { withRateLimit, type RateLimitCheckResult } from "@/lib/rate-limit";

export const GET = withRateLimit(
  async (req) => Response.json({ ok: true }),
  { tier: "moderate" }
);
```

See [@g14o/utils](../utils/README.md) for tiers, environment behavior, and publishing.
