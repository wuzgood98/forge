import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARBALL_VERSION_SUFFIX = /-\d+\.\d+\.\d+\.tgz$/;

function tarballToPackageName(filename) {
  const base = filename.replace(TARBALL_VERSION_SUFFIX, "");
  if (base.startsWith("g14o-")) {
    return `@g14o/${base.slice("g14o-".length)}`;
  }
  if (base.startsWith("g14o-")) {
    return `@g14o/${base.slice("g14o-".length)}`;
  }
  throw new Error(`Unrecognized packed tarball name: ${filename}`);
}

const packages = [
  {
    filter: "@g14o/utils",
    importPath: "@g14o/utils",
    exports: [
      "configureUtils",
      "createRedisClient",
      "parseNumber",
      "resolveRedisClient",
      "stringifyParams",
    ],
  },
  {
    filter: "@g14o/cache",
    importPath: "@g14o/cache",
    exports: ["createCache", "withCache", "getCache", "createCacheKey"],
  },
  {
    filter: "@g14o/ratelimit",
    importPath: "@g14o/ratelimit",
    exports: [
      "createRateLimit",
      "checkRateLimit",
      "withRateLimit",
      "parseDurationToMs",
    ],
  },
];

const packDir = mkdtempSync(join(tmpdir(), "g14o-pack-"));
const consumerDir = mkdtempSync(join(tmpdir(), "g14o-consumer-"));

try {
  for (const { filter } of packages) {
    execSync(`pnpm --filter ${filter} pack --pack-destination "${packDir}"`, {
      cwd: root,
      stdio: "pipe",
    });
  }

  const tarballs = readdirSync(packDir).filter((name) => name.endsWith(".tgz"));
  if (tarballs.length !== packages.length) {
    throw new Error(
      `Expected ${packages.length} tarballs in ${packDir}, found: ${tarballs.join(", ")}`
    );
  }

  const tarballByScope = Object.fromEntries(
    tarballs.map((file) => [
      tarballToPackageName(file),
      `file:${join(packDir, file).replace(/\\/g, "/")}`,
    ])
  );

  for (const { filter } of packages) {
    if (!tarballByScope[filter]) {
      throw new Error(
        `Missing tarball mapping for ${filter}. Found: ${Object.keys(tarballByScope).join(", ")}`
      );
    }
  }

  writeFileSync(
    join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        name: "g14o-smoke-consumer",
        private: true,
        type: "module",
        dependencies: {
          ...tarballByScope,
          next: "16.2.6",
        },
        pnpm: {
          overrides: {
            "@g14o/utils": tarballByScope["@g14o/utils"],
            "@g14o/cache": tarballByScope["@g14o/cache"],
          },
        },
      },
      null,
      2
    )}\n`
  );

  execSync("pnpm install --no-frozen-lockfile", {
    cwd: consumerDir,
    stdio: "inherit",
  });

  const entryFileByPackage = {
    "@g14o/utils": "dist/utils.js",
    "@g14o/cache": "dist/index.js",
    "@g14o/ratelimit": "dist/index.js",
  };

  const importableInNode = new Set(["@g14o/utils", "@g14o/cache"]);

  for (const { importPath, exports: names } of packages) {
    const pkgName = importPath.split("/")[1];
    const pkgRoot = join(consumerDir, "node_modules", "@g14o", pkgName);
    const entryFile = entryFileByPackage[importPath];
    const entryPath = join(pkgRoot, entryFile);

    if (!existsSync(entryPath)) {
      throw new Error(`${importPath}: missing packed entry ${entryFile}`);
    }

    const packedPkg = JSON.parse(
      readFileSync(join(pkgRoot, "package.json"), "utf8")
    );
    const rootExport = packedPkg.exports?.["."];
    const importTarget =
      typeof rootExport === "string" ? rootExport : rootExport?.import;
    if (!importTarget?.includes("dist")) {
      throw new Error(
        `${importPath}: packed package.json "." export must point at dist (got ${JSON.stringify(rootExport)})`
      );
    }

    if (importableInNode.has(importPath)) {
      const mod = await import(pathToFileURL(entryPath).href);
      for (const name of names) {
        if (typeof mod[name] !== "function") {
          throw new Error(
            `${importPath}: expected function export "${name}" in packed tarball`
          );
        }
      }
    } else {
      const dts = readFileSync(join(pkgRoot, "dist/index.d.ts"), "utf8");
      for (const name of names) {
        if (!dts.includes(name)) {
          throw new Error(
            `${importPath}: expected export "${name}" in dist/index.d.ts (Next.js runtime; types-only smoke in Node)`
          );
        }
      }
    }

    console.log(`${importPath}: packed smoke OK (${names.join(", ")})`);
  }

  console.log("All packed smoke checks passed.");
} finally {
  for (const dir of [packDir, consumerDir]) {
    try {
      rmSync(dir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
    } catch {
      // Windows may briefly lock node_modules under consumerDir
    }
  }
}
