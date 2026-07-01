// Headless screenshot harness for local verification.
//
// Logs in as the DEV-only dev account (POST /api/dev/login — see
// z-docs/infrastructure/testing-and-ci.md), then captures full-page PNGs of the
// requested routes into frontend/.screenshots/. Because the login endpoint mints
// a real REGISTERED session, behind-login pages (decks, editor, present,
// sessions) render as a logged-in user rather than the login modal.
//
// Prereqs: infra + backend (:8080, DEV profile) + frontend dev server (:5173) all
// running, and `npx playwright install chromium` done once.
//
// Usage:
//   npm run screenshot                       # default routes
//   npm run screenshot -- /decks /account    # explicit routes
//   npm run screenshot -- /decks/<id>/edit   # id-bearing routes need a real id

import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const BACKEND = process.env.SCREENSHOT_BACKEND ?? "http://localhost:8080";
const FRONTEND = process.env.SCREENSHOT_FRONTEND ?? "http://localhost:5173";

// Routes to capture; override by passing them as CLI args after `--`.
const DEFAULT_ROUTES = ["/", "/decks"];
const routes = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROUTES;

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", ".screenshots");

/** Turns a route into a filesystem-safe file stem (e.g. "/decks/x/edit" -> "decks_x_edit"). */
function slug(route) {
  const cleaned = route.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "_");
  return cleaned.length > 0 ? cleaned : "root";
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    // context.request shares the context cookie jar, so AMBI_AT/AMBI_RT set by the
    // login response are sent by every page the context subsequently opens.
    const login = await context.request.post(`${BACKEND}/api/dev/login`);
    if (!login.ok()) {
      throw new Error(
        `dev login failed: ${login.status()} ${login.statusText()} — is the backend up on the DEV profile?`,
      );
    }

    for (const route of routes) {
      const page = await context.newPage();
      try {
        await page.goto(`${FRONTEND}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
        // Prefer a settled network for data-loaded screenshots, but don't fail on
        // routes with continuous background traffic (session heartbeats, query
        // refetch) where "networkidle" never fires — capture what's rendered.
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
        const path = join(outDir, `${slug(route)}.png`);
        await page.screenshot({ path, fullPage: true });
        console.log(`captured ${route} -> ${path}`);
      } catch (err) {
        console.error(`failed to capture ${route}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
