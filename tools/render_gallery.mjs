#!/usr/bin/env node
/** Capture actual sandboxed application output; never manufacture derived HTML. */
import {chromium} from 'playwright';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

class GalleryBrowserPreview {
  constructor(output) {
    this.root = path.resolve(output);
    this.gallery = path.join(this.root, 'gallery');
    this.manifestPath = path.join(this.gallery, 'gallery-manifest.json');
    this.frameWidth = 800;
  }
  async serve(request, response) {
    try {
      const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = path.resolve(this.root, '.' + (name.endsWith('/') ? name + 'index.html' : name));
      assert(file.startsWith(this.root + path.sep), 'The local server only exposes the built application.');
      const real = await fs.realpath(file);
      assert(real.startsWith(this.root + path.sep), 'The local server does not follow paths outside the build.');
      const stat = await fs.stat(file);
      assert(stat.isFile() && stat.size <= 96 * 1024 * 1024, 'A served artifact must be a bounded file.');
      const types = {'.html': 'text/html', '.txt': 'text/plain', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.pdf': 'application/pdf', '.wasm': 'application/wasm'};
      response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
      response.end(await fs.readFile(file));
    } catch {
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.end('Not found');
    }
  }
  async run() {
    const manifest = JSON.parse(await fs.readFile(this.manifestPath, 'utf8'));
    assert.equal(manifest.schemaVersion, 1);
    assert.deepEqual(manifest.cases.map(sample => sample.id).sort(), [
      'apparences', 'formulaire-reset', 'graphique', 'jbig2', 'jpeg',
      'jpeg2000', 'mathml', 'signature', 'structure', 'table-listes',
    ], 'The ten release examples must each have one actual browser capture.');
    await fs.access(path.join(this.root, 'index.html'));
    const server = createServer((request, response) => this.serve(request, response));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    let browser;
    const captures = [];
    const forbiddenRequests = [];
    const errors = [];
    const staged = [];
    try {
      browser = await chromium.launch({headless: true});
      const context = await browser.newContext({viewport: {width: 930, height: 1500}, deviceScaleFactor: 1, locale: 'en-US', colorScheme: 'light', reducedMotion: 'reduce'});
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol)) return route.continue();
        forbiddenRequests.push(url.href);
        return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      for (const sample of manifest.cases) {
        assert.match(sample.id, /^[a-z][a-z0-9-]*$/);
        await page.goto(`${origin}/?sample=${encodeURIComponent(sample.id)}`, {waitUntil: 'domcontentloaded'});
        await page.waitForFunction(id => document.querySelector(`[data-sample="${id}"]`)?.getAttribute('aria-pressed') === 'true'
          && document.querySelector('[data-demo-root]')?.getAttribute('aria-busy') === 'false', sample.id);
        await page.locator('#demo-tab-html').click();
        const frameElement = page.locator('iframe[title="Derived HTML"]');
        await frameElement.waitFor({state: 'visible'});
        assert.equal(await frameElement.getAttribute('sandbox'), sample.profile === 'reset' ? 'allow-scripts' : '');
        // Only the containing iframe's viewport is resized. Its derived document is untouched.
        await frameElement.evaluate((element, width) => { element.style.width = width + 'px'; }, this.frameWidth);
        const frame = await (await frameElement.elementHandle()).contentFrame();
        assert(frame, 'The real application must create its result frame.');
        await frame.waitForLoadState('load');
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          ready = await frame.evaluate(() => document.fonts.status === 'loaded' && [...document.images].every(image => image.complete && image.naturalWidth > 0));
          if (ready) break;
          await page.waitForTimeout(50);
        }
        assert(ready, sample.id + ': fonts and images must finish loading.');
        const bounds = await frame.evaluate(() => ({height: Math.ceil(Math.max(document.body.scrollHeight, document.body.getBoundingClientRect().height)) + 24, width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth}));
        assert(bounds.height > 0 && bounds.height <= 4096, 'Preview documents have a bounded capture height.');
        assert(bounds.scrollWidth <= this.frameWidth, sample.id + ': the capture viewport must not clip horizontal content.');
        await frameElement.evaluate((element, height) => { element.style.height = height + 'px'; element.style.minHeight = '0'; }, bounds.height);
        await frame.locator('body').waitFor({state: 'visible'});
        // Passive sandbox frames cannot run requestAnimationFrame callbacks.
        await page.waitForTimeout(100);
        const filename = `${sample.id}/html-preview.png`;
        const temporary = path.join(this.gallery, sample.id, 'html-preview.building.png');
        staged.push(temporary);
        const bytes = await frame.locator('body').screenshot({path: temporary, animations: 'disabled', caret: 'hide', scale: 'css'});
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert(bytes.length <= 16 * 1024 * 1024);
        const record = {path: filename, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), mediaType: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)};
        assert(record.width > 0 && record.height > 0 && record.width <= 900 && record.height <= 4096);
        captures.push({sample, record, temporary});
      }
      assert.deepEqual(forbiddenRequests, [], 'Gallery rendering must make no external request.');
      assert.deepEqual(errors, [], 'Gallery rendering must have no browser error.');
      const require = createRequire(import.meta.url);
      manifest.browserPreview = {engine: 'chromium', version: browser.version(), playwright: require('playwright/package.json').version, viewportWidth: this.frameWidth, deviceScaleFactor: 1, locale: 'en-US', source: 'application sandboxed iframe body', htmlRetouched: false};
      for (const {sample, record, temporary} of captures) {
        await fs.rename(temporary, path.join(this.gallery, record.path));
        sample.files.htmlPreview = record;
        manifest.assets = manifest.assets.filter(asset => asset.path !== record.path);
        const {width, height, ...asset} = record;
        manifest.assets.push(asset);
      }
      manifest.assets.sort((left, right) => left.path.localeCompare(right.path, 'en'));
      await fs.writeFile(this.manifestPath + '.building', JSON.stringify(manifest, null, 2) + '\n');
      await fs.rename(this.manifestPath + '.building', this.manifestPath);
      process.stdout.write(JSON.stringify({status: 'pass', previews: captures.length, browserPreview: manifest.browserPreview, files: captures.map(({record}) => record)}) + '\n');
    } finally {
      for (const filename of staged) await fs.rm(filename, {force: true});
      if (browser) await browser.close();
      await new Promise(resolve => server.close(resolve));
    }
  }
}

const args = process.argv.slice(2);
assert(args.length === 2 && args[0] === '--output', 'Usage: node tools/render_gallery.mjs --output DIST');
await new GalleryBrowserPreview(args[1]).run();
