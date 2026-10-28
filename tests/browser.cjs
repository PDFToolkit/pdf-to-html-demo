/* Real browser acceptance checks for both the standalone and documentation UI. */
const {chromium, firefox} = require('playwright');
const {unzipSync} = require('fflate');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

class BrowserChecks {
  constructor() {
    const args = process.argv.slice(2);
    const argument = (name, fallback) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; };
    this.base = new URL(argument('--base-url', 'http://127.0.0.1:8080/'));
    this.output = path.resolve(argument('--output', '_build/browser'));
    this.site = args.includes('--site');
    this.report = {passed: false, site: this.site, base: this.base.href, browsers: {}};
  }
  async run() {
    await fs.mkdir(this.output, {recursive: true});
    try {
      for (const [name, type] of Object.entries({chromium, firefox})) await this.browser(name, type);
      this.report.passed = true;
    } finally { await fs.writeFile(path.join(this.output, 'report.json'), JSON.stringify(this.report, null, 2) + '\n'); }
    process.stdout.write(JSON.stringify(this.report, null, 2) + '\n');
  }
  async browser(name, type) {
    const browser = await type.launch({headless: true});
    const record = this.report.browsers[name] = {version: browser.version(), checks: [], screenshots: []};
    const context = await browser.newContext({viewport: {width: 1440, height: 1100}, acceptDownloads: true});
    const page = await context.newPage();
    const requests = [], errors = [];
    context.on('request', request => requests.push({url: request.url(), method: request.method(), body: request.postData()}));
    page.on('pageerror', error => errors.push(error.message));
    const check = (description, condition = true) => { assert.ok(condition, description); record.checks.push(description); };
    const screenshot = async label => {
      const filename = name + '-' + label + '.png';
      await page.screenshot({path: path.join(this.output, filename), fullPage: true}); record.screenshots.push(filename);
    };
    const en = new URL(this.site ? 'modules/to-html/demo/' : './', this.base);
    const fr = new URL(this.site ? 'fr/modules/to-html/demo/' : 'fr/', this.base);
    try {
      await page.goto(en.href);
      await page.locator('.demo-sample').first().waitFor();
      await page.waitForFunction(() => document.querySelector('[data-demo-root]')?.getAttribute('aria-busy') === 'false' && document.querySelector('.demo-result-frame'));
      const assetBase = new URL(await page.locator('[data-demo-root]').getAttribute('data-demo-base'), en);
      const galleryBase = new URL('gallery/', assetBase);
      const manifest = await (await context.request.get(new URL('gallery-manifest.json', galleryBase).href)).json();
      check('Seven real PDF examples are available', manifest.cases.length === 7 && await page.locator('.demo-sample').count() === 7);
      check('No PHP runtime is fetched just to browse the gallery', !requests.some(item => /\.wasm(?:\.gz)?$|application\.zip/.test(item.url)));
      for (const sample of manifest.cases) {
        await page.locator('[data-sample="' + sample.id + '"]').click();
        await page.waitForFunction(id => document.querySelector('[data-sample="' + id + '"]')?.getAttribute('aria-pressed') === 'true'
          && document.querySelector('[data-demo-root]')?.getAttribute('aria-busy') === 'false', sample.id);
        const frame = page.frameLocator('iframe[title="Derived HTML"]');
        for (const tag of sample.expected?.tags || []) await frame.locator(tag).first().waitFor();
        check(sample.id + ': expected semantic elements survive real PDF reading');
        const imageInfo = await page.locator('.demo-pdf-pages img').evaluateAll(async images => {
          await Promise.all(images.map(image => image.decode()));
          return images.map(image => ({complete: image.complete, width: image.naturalWidth}));
        });
        check(sample.id + ': source PDF preview is rendered', imageInfo.length > 0 && imageInfo.every(image => image.complete && image.width > 10));
        const sandbox = await page.locator('iframe[title="Derived HTML"]').getAttribute('sandbox');
        check(sample.id + ': result iframe has the exact restricted permissions', sandbox === (sample.profile === 'reset' ? 'allow-scripts' : ''));
        if (sample.id === 'mathml') {
          const math = await frame.locator('math').evaluate(element => {
            const fraction = element.querySelector('mfrac');
            const a = fraction.children[0].getBoundingClientRect(), b = fraction.children[1].getBoundingClientRect();
            return {namespace: element.namespaceURI, numeratorAbove: a.bottom <= b.top + 2, width: element.getBoundingClientRect().width};
          });
          check('MathML uses its native namespace and stacked fraction layout', math.namespace === 'http://www.w3.org/1998/Math/MathML' && math.numeratorAbove && math.width > 0);
        }
        if (sample.profile === 'reset') {
          const field = frame.locator('input[name="Name"]');
          assert.equal(await field.inputValue(), 'Grace Hopper');
          await field.fill('A visitor');
          await frame.locator('select[name="Language"]').selectOption('fr');
          await frame.locator('[data-pdf-form-action="ResetForm"]').click();
          await field.evaluate(element => { if (element.value !== 'Ada Lovelace') throw new Error('Reset did not restore the PDF default'); });
          check('The real reset runtime restores Name while preserving the unselected Language field', await frame.locator('select[name="Language"]').inputValue() === 'fr');
        }
        if (sample.id === 'signature') {
          const button = frame.locator('[popovertarget]'); await button.click();
          check('The signature popover opens without scripts', await frame.locator('[popover]').evaluate(element => element.matches(':popover-open')));
          check('The chosen-certificate status is integrity-verified, not PKI trust', await frame.locator('[data-pdf-signature-status="integrity-verified"]').count() > 0);
        }
        if (sample.id === 'apparences') {
          const button = frame.locator('button').first();
          await button.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
          const normal = await button.screenshot(); await button.hover(); const hover = await button.screenshot();
          await page.mouse.down(); const pressed = await button.screenshot(); await page.mouse.up();
          check('Normal, hover and pressed widget appearances are visibly different', !normal.equals(hover) && !hover.equals(pressed));
        }
        await screenshot(sample.id);
        await page.getByRole('tab', {name: 'HTML code', exact: true}).click();
        const expected = await (await context.request.get(new URL(sample.files.html.path, galleryBase).href)).text();
        assert.equal(await page.locator('.demo-code').textContent(), expected);
        check(sample.id + ': displayed source is byte-identical to the converter output');
      }
      const basic = manifest.cases.find(sample => sample.id === 'mathml');
      const pdf = await (await context.request.get(new URL(basic.files.pdf.path, galleryBase).href)).body();
      const expected = await (await context.request.get(new URL(basic.files.html.path, galleryBase).href)).text();
      const beforeUpload = requests.length;
      await page.locator('input[type=file]').setInputFiles({name: 'mathml.pdf', mimeType: 'application/pdf', buffer: pdf});
      await page.waitForFunction(() => document.querySelector('.demo-status')?.textContent.includes('Conversion complete'), null, {timeout: 45000});
      await page.getByRole('tab', {name: 'HTML code', exact: true}).click();
      assert.equal(await page.locator('.demo-code').textContent(), expected);
      check('A user-selected PDF is actually converted in WebAssembly to the exact native HTML');
      check('Conversion sends no PDF bytes and uses only local GET assets', requests.slice(beforeUpload).every(request => !request.body && request.method === 'GET' && new URL(request.url).origin === this.base.origin));
      await page.getByRole('tab', {name: 'Source PDF', exact: true}).click();
      check('Imported source remains available with an explicit reader action', await page.locator('.demo-source-file').count() === 1
        && (await page.locator('.demo-source-file').textContent()).includes('mathml.pdf') && await page.locator('.demo-source-file iframe').count() === 0);
      await page.getByRole('tab', {name: 'HTML code', exact: true}).click();
      const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', {name: 'Download HTML + assets', exact: true}).click();
      const download = await downloadEvent; const zip = unzipSync(await fs.readFile(await download.path()));
      assert.equal(Buffer.from(zip['document.html']).toString(), expected);
      check('Downloaded ZIP contains exact HTML and explicit diagnostics', !!zip['diagnostics.json']);
      await page.locator('input[type=file]').setInputFiles({name: 'private-name-never-sent.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\ninvalid')});
      await page.waitForFunction(() => document.querySelector('.demo-status')?.dataset.error === 'true', null, {timeout: 45000});
      check('Malformed input produces an explicit error, with no stale success preview', await page.locator('.demo-workspace iframe').count() === 0);
      check('The private filename is never included in a request', !requests.some(request => request.url.includes('private-name-never-sent') || request.body?.includes('private-name-never-sent')));
      await page.locator('input[type=file]').setInputFiles({name: 'too-large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(8 * 1024 * 1024 + 1, 32)});
      check('Oversize input is refused before conversion', (await page.locator('.demo-status').textContent()).includes('8 MiB'));
      await page.route('**/assets/conversion-worker.js', async route => { await new Promise(resolve => setTimeout(resolve, 500)); await route.continue().catch(() => {}); });
      await page.locator('input[type=file]').setInputFiles({name: 'cancel.pdf', mimeType: 'application/pdf', buffer: pdf});
      await page.getByRole('button', {name: 'Cancel', exact: true}).click();
      check('Cancellation terminates the pending job and clears busy state', (await page.locator('.demo-status').textContent()).includes('cancelled') && await page.locator('[data-demo-root]').getAttribute('aria-busy') === 'false');
      await page.unroute('**/assets/conversion-worker.js');
      await page.getByRole('button', {name: 'Clear my file', exact: true}).click();
      check('Clear removes the file and result from the interface', await page.locator('input[type=file]').evaluate(element => element.files.length === 0));
      await this.raceChecks(context, en, assetBase, pdf, check);
      const isolation = await page.evaluate(async moduleUrl => {
        const {PreviewDocument} = await import(moduleUrl);
        const urls = [];
        const preview = new PreviewDocument({html: '<html><head><base href="https://example.invalid/"></head><body onload="parent.__leaked=1"><script>parent.__leaked=1</script><a href="https://example.invalid/private">outside</a><img src="https://example.invalid/pixel"><iframe src="https://example.invalid/"></iframe><form action="https://example.invalid/"><button formaction="https://example.invalid/">Send</button></form></body></html>', assets: [], trustedReset: false}, urls).build();
        const doc = new DOMParser().parseFromString(preview, 'text/html');
        let expansionRejected = false;
        try {
          new PreviewDocument({html: '<html><body>' + '<img src="large.png">'.repeat(128) + '</body></html>',
            assets: [{filename: 'large.png', mediaType: 'image/png', bytes: new Uint8Array(256 * 1024)}], trustedReset: false}, []).build();
        } catch (error) { expansionRejected = error.code === 'preview_limit'; }
        return {scripts: doc.querySelectorAll('script,iframe,base,[onload],[action],[formaction]').length, remote: [...doc.querySelectorAll('[href],[src]')].some(element => /https?:/.test(element.getAttribute('href') || element.getAttribute('src'))), csp: doc.querySelector('meta[http-equiv]').content, expansionRejected};
      }, new URL('app.js', assetBase).href);
      check('Preview isolation strips active elements, remote navigation and submission URLs', isolation.scripts === 0 && !isolation.remote && isolation.csp.includes("connect-src 'none'"));
      check('Repeated embedded assets cannot expand the preview beyond its memory budget', isolation.expansionRejected);
      await page.goto(fr.href);
      await page.locator('.demo-result-frame').first().waitFor();
      check('The French interface includes translated upload and inspection controls', await page.getByRole('button', {name: 'Choisir un PDF', exact: true}).count() === 1 && await page.getByRole('tab', {name: 'Code HTML', exact: true}).count() === 1);
      await screenshot('fr-desktop');
      await page.getByRole('tab', {name: 'Comparer', exact: true}).focus(); await page.keyboard.press('ArrowRight');
      check('Tabs support keyboard arrow navigation', await page.getByRole('tab', {name: 'Résultat HTML', exact: true}).getAttribute('aria-selected') === 'true');
      await page.setViewportSize({width: 390, height: 844});
      await page.getByRole('tab', {name: 'Comparer', exact: true}).click();
      check('The mobile page fits the viewport without horizontal scrolling', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await screenshot('fr-mobile');
      check('Application scripts produce no uncaught browser errors', errors.length === 0);
      record.requests = requests.length;
      record.passed = true;
    } finally { await browser.close(); }
  }
  async raceChecks(context, url, assetBase, pdf, check) {
    const page = await context.newPage();
    let releaseManifest, manifestRequested, releaseZip, zipRequested;
    const manifestGate = new Promise(resolve => { releaseManifest = resolve; });
    const manifestStarted = new Promise(resolve => { manifestRequested = resolve; });
    const zipGate = new Promise(resolve => { releaseZip = resolve; });
    const zipStarted = new Promise(resolve => { zipRequested = resolve; });
    try {
      await page.route('**/gallery/gallery-manifest.json', async route => {
        manifestRequested(); await manifestGate; await route.continue().catch(() => {});
      });
      await page.goto(url.href);
      await manifestStarted;
      await page.locator('input[type=file]').setInputFiles({name: 'startup-race.pdf', mimeType: 'application/pdf', buffer: pdf});
      await page.waitForFunction(() => document.querySelector('.demo-status')?.textContent.includes('Conversion complete'), null, {timeout: 45000});
      releaseManifest();
      await page.waitForFunction(() => document.querySelector('.demo-sample') && document.querySelector('[data-demo-root]')?.getAttribute('aria-busy') === 'false');
      check('A late initial gallery manifest cannot replace an imported result',
        await page.locator('.demo-workspace h3').textContent() === 'startup-race.pdf'
        && (await page.locator('.demo-status').textContent()).includes('Conversion complete'));
      await page.route('**/assets/fflate.js', async route => {
        zipRequested(); await zipGate; await route.continue().catch(() => {});
      });
      const downloads = [];
      page.on('download', download => downloads.push(download.suggestedFilename()));
      await page.getByRole('button', {name: 'Download HTML + assets', exact: true}).click();
      await zipStarted;
      await page.getByRole('button', {name: 'Clear my file', exact: true}).click();
      releaseZip();
      await page.evaluate(moduleUrl => import(moduleUrl).then(() => true), new URL('assets/fflate.js', assetBase).href);
      check('Clearing a file cancels a pending ZIP export without restoring errors or results', downloads.length === 0
        && await page.locator('.demo-workspace h3').count() === 0
        && await page.locator('.demo-status').getAttribute('data-error') === 'false'
        && await page.locator('input[type=file]').evaluate(element => element.files.length === 0));
    } finally {
      releaseManifest(); releaseZip(); await page.close();
    }
  }
}

new BrowserChecks().run().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
