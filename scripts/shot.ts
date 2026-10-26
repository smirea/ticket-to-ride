import { chromium } from 'playwright-core';

// Usage: bun run shot <path-or-url> <out.png> [width]x[height] [--wait=<css selector>] [--eval=<js run before the shot>]
// Paths are resolved against the dev server (bun run dev). Uses the Chromium that Playwright installs (bunx playwright install chromium).
const [target, out = '/tmp/ttr-shot.png', size = '1440x900', ...flags] = process.argv.slice(2);
if (!target) throw new Error('Usage: bun run shot <path-or-url> <out.png> [WxH] [--wait=selector] [--eval=js]');
const [width, height] = size.split('x').map(Number);
const flag = (name: string) => flags.find(item => item.startsWith(`--${name}=`))?.slice(name.length + 3);
const url = target.startsWith('http') ? target : `http://127.0.0.1:${process.env.UI_PORT ?? 6090}${target}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: width!, height: height! } });
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => message.type() === 'error' && errors.push(message.text()));
await page.goto(url, { waitUntil: 'networkidle' });
const wait = flag('wait');
if (wait) await page.waitForSelector(wait, { timeout: 15000 });
const script = flag('eval');
if (script) await page.evaluate(script);
await page.waitForTimeout(1200);
await page.screenshot({ path: out, animations: 'disabled' });
await browser.close();
console.log(out);
if (errors.length) console.log(`Browser errors:\n${errors.join('\n')}`);
