#!/usr/bin/env node
/**
 * Capture colocation devtools screenshots for README.
 * Run with dev server on PORT (default 3099).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../docs/screenshots');
const BASE = process.env.BASE_URL ?? 'http://localhost:3099';
const PORT = process.env.PORT ?? '3099';

async function waitForAudit(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-route-lens]')?.textContent?.includes('loading'),
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(600);
}

async function openPanel(page) {
  await page.keyboard.press('Alt+Shift+C');
  await page.waitForTimeout(500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const chromePath =
    process.env.CHROME_PATH ??
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(`${BASE}/blog`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // 1. Page with widget visible
  await page.screenshot({ path: path.join(OUT, '01-page-with-widget.png'), fullPage: false });

  await openPanel(page);
  await waitForAudit(page);

  // 2. Panel open — default tree
  await page.screenshot({ path: path.join(OUT, '02-panel-tree.png'), fullPage: false });

  // 3. Settings — debug preset
  const settingsBtn = page.locator('[data-route-lens] button:has-text("settings")');
  if (await settingsBtn.count()) {
    await settingsBtn.click();
    await page.waitForTimeout(300);
  }
  const debugChip = page.locator('[data-route-lens] button:has-text("debug")');
  if (await debugChip.count()) {
    await debugChip.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(OUT, '03-settings-debug.png'), fullPage: false });

  // 4. Audit preset
  const auditChip = page.locator('[data-route-lens] button:has-text("audit")');
  if (await auditChip.count()) {
    await auditChip.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(OUT, '04-audit-preset.png'), fullPage: false });

  // 5. Focus a cross-route file (ShopCard)
  const shopCard = page.locator('[data-route-lens] [data-audit-file*="ShopCard"]');
  if (await shopCard.count()) {
    await shopCard.first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, '05-focus-cross-route.png'), fullPage: false });
  }

  // 6. Inspect mode
  const inspectToggle = page.locator('[data-route-lens] label:has-text("inspect mode") input');
  if (await inspectToggle.count()) {
    await inspectToggle.check();
    await page.waitForTimeout(300);
    await page.mouse.move(640, 400);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, '06-inspect-mode.png'), fullPage: false });
  }

  // 7. Navigate preset
  const navChip = page.locator('[data-route-lens] button:has-text("navigate")');
  if (await navChip.count()) {
    await navChip.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, '07-navigate-preset.png'), fullPage: false });
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUT} (BASE=${BASE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
