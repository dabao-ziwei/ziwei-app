import { readFile } from 'node:fs/promises';
import { ExportError } from './consultationCharts.mjs';

let active = false;
const recent = new Map();
export async function renderNatalPNG(row, caller, environment = process.env) {
  const now = Date.now();
  for (const [key, times] of recent) {
    const remaining = times.filter(t => now - t < 60000);
    if (remaining.length) recent.set(key, remaining); else recent.delete(key);
  }
  const history = recent.get(caller) || [];
  if (active || history.length >= 8) throw new ExportError(429, 'EXPORT_BUSY', '產圖忙碌，請稍後重試',
    { retry_after: active ? 5 : Math.max(1, Math.ceil((history[0] + 60000 - now) / 1000)) });
  active = true;
  recent.set(caller, [...(recent.get(caller) || []), now]);
  let browser;
  let timer;
  let stopped = false;
  const work = async () => {
    const [{ default: puppeteer }, module, css] = await Promise.all([
      import('puppeteer-core'), import('./generated/natal-render.mjs'), readFile(new URL('./generated/natal-chart.css', import.meta.url), 'utf8'),
    ]);
    const html = module.buildNatalHTML(row, css);
    let executablePath = environment.CONSULTATION_CHROME_EXECUTABLE;
    let args = [];
    if (!executablePath) {
      if (process.platform !== 'linux') throw new ExportError(503, 'EXPORT_UNAVAILABLE', '本機尚未設定獨立產圖瀏覽器');
      const { default: chromium } = await import('@sparticuz/chromium');
      executablePath = await chromium.executablePath();
      args = chromium.args;
    }
    if (stopped) throw new ExportError(504, 'RENDER_TIMEOUT', '產圖逾時');
    browser = await puppeteer.launch({ executablePath, args, headless:true, timeout:15000,
      defaultViewport:{ width:1280,height:960,deviceScaleFactor:2 } });
    if (stopped) { await browser.close(); throw new ExportError(504, 'RENDER_TIMEOUT', '產圖逾時'); }
    const render = async () => {
      const page = await browser.newPage();
      page.setDefaultTimeout(12000);
      await page.setRequestInterception(true);
      page.on('request', request => {
        // No external network, URLs, credentials or customer browser profile enter rendering.
        void (/^(data:|about:)/.test(request.url()) ? request.continue() : request.abort()).catch(() => {});
      });
      // The HTML's CSP forbids page scripts. Keep the JS engine available for the
      // trusted font/paint readiness evaluation (disabling it also stalls rAF).
      await page.setContent(html, { waitUntil:'load', timeout:15000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
        const text = document.getElementById('consultation-natal').textContent;
        await document.fonts.load('16px "Noto Sans TC"', text);
        if (!document.fonts.check('16px "Noto Sans TC"', text) || [...document.fonts].some(font => font.status === 'error')) throw new Error('Font load failed');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const dimensions = await page.$eval('#consultation-natal', node => ({ width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,
        palaces:node.querySelectorAll('[data-natal-palace]').length,
        visibleNatalBadges:[...node.querySelectorAll('[data-sihua-badge="ben"]')].filter(b => b.getBoundingClientRect().height > 0 && getComputedStyle(b).display !== 'none').length }));
      if (dimensions.width !== 1280 || dimensions.height !== 960 || dimensions.palaces !== 12 || dimensions.visibleNatalBadges !== 4) throw new Error('Incomplete natal chart');
      const png = await page.screenshot({ type:'png', clip:{x:0,y:0,width:1280,height:960}, timeout:12000 });
      return { png, rendererRevision:module.rendererRevision };
    };
    return render();
  };
  try {
    return await Promise.race([work(), new Promise((_,reject) => {
      timer = setTimeout(() => { stopped = true; reject(new ExportError(504, 'RENDER_TIMEOUT', '產圖逾時，請稍後重試')); }, 35000);
    })]);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ERR_MODULE_NOT_FOUND') throw new ExportError(503, 'EXPORT_UNAVAILABLE', '產圖建置資產尚未備妥');
    throw error;
  } finally {
    stopped = true;
    clearTimeout(timer);
    try { await browser?.close(); } catch { /* Preserve the original render result/error. */ }
    active = false;
  }
}
