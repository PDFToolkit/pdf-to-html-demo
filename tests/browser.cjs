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
      check('Ten real PDF examples are available', manifest.cases.length === 10 && await page.locator('.demo-sample').count() === 10);
      check('No PHP runtime is fetched just to browse the gallery', !requests.some(item => /\.wasm(?:\.gz)?$|application\.zip/.test(item.url)));
      check('Every gallery card offers its own source PDF download', await page.locator('.demo-sample-download[download]').count() === manifest.cases.length);
      await page.getByRole('button', {name: 'See the result', exact: true}).click();
      check('The explicit result shortcut moves keyboard focus to the visible result heading', await this.resultFocused(page));
      for (const sample of manifest.cases) {
        await page.locator('[data-sample="' + sample.id + '"]').click();
        await page.waitForFunction(id => document.querySelector('[data-sample="' + id + '"]')?.getAttribute('aria-pressed') === 'true'
          && document.querySelector('[data-demo-root]')?.getAttribute('aria-busy') === 'false', sample.id);
        check(sample.id + ': choosing an example reveals its result and moves keyboard focus', await this.resultFocused(page));
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
          await this.widgetAppearances(page, frame, check, record);
        }
        await screenshot(sample.id);
        await page.getByRole('tab', {name: 'HTML code', exact: true}).click();
        const expected = await (await context.request.get(new URL(sample.files.html.path, galleryBase).href)).text();
        assert.equal(await page.locator('.demo-code').textContent(), expected);
        check(sample.id + ': source defaults to the original layout', await page.locator('.demo-code').getAttribute('data-mode') === 'original'
          && await page.locator('.demo-source-token').count() === 0);
        await page.getByRole('button', {name: 'Readable view', exact: true}).click();
        assert.equal(await page.locator('.demo-code').textContent(), expected);
        check(sample.id + ': readable source preserves every character of the converter output', await page.locator('.demo-source-token').count() > 3);
      }
      await this.sourcePresentation(page, assetBase, check, record);
      const sampleLink = page.locator('.demo-sample-download').first();
      const sourceDownloadEvent = page.waitForEvent('download'); await sampleLink.click();
      const sourceDownload = await sourceDownloadEvent;
      const sourceBytes = await fs.readFile(await sourceDownload.path());
      check('A gallery source download returns the exact inventoried PDF', crypto.createHash('sha256').update(sourceBytes).digest('hex') === manifest.cases[0].files.pdf.sha256);
      const basic = manifest.cases.find(sample => sample.id === 'mathml');
      const pdf = await (await context.request.get(new URL(basic.files.pdf.path, galleryBase).href)).body();
      const expected = await (await context.request.get(new URL(basic.files.html.path, galleryBase).href)).text();
      const beforeUpload = requests.length;
      await page.locator('input[type=file]').setInputFiles({name: 'mathml.pdf', mimeType: 'application/pdf', buffer: pdf});
      await page.waitForFunction(() => document.querySelector('.demo-status')?.textContent.includes('Conversion complete'), null, {timeout: 45000});
      check('A completed import reveals its result and focuses the heading', await this.resultFocused(page));
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
      await this.imageImports(page, context, manifest, galleryBase, requests, check, screenshot, record);
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
      await this.startupChecks(context, en, fr, pdf, check, record, name);
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
      await page.getByRole('button', {name: 'Voir le résultat', exact: true}).click();
      check('The French result shortcut focuses its visible result', await this.resultFocused(page));
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
    } catch (error) {
      record.failure = {
        message: error.message,
        status: await page.locator('.demo-status').textContent().catch(() => null),
        busy: await page.locator('[data-demo-root]').getAttribute('aria-busy').catch(() => null),
        pageErrors: errors,
      };
      await screenshot('failure').catch(() => {});
      throw error;
    } finally { await browser.close(); }
  }
  async resultFocused(page) {
    return page.locator('.demo-workspace h3').evaluate(heading => {
      const bounds = heading.getBoundingClientRect();
      return document.activeElement === heading && bounds.top >= 0 && bounds.bottom <= innerHeight;
    });
  }
  async sourcePresentation(page, assetBase, check, record) {
    const original = await page.locator('.demo-code').textContent();
    await page.getByRole('button', {name: 'Original source', exact: true}).click();
    check('Original source view preserves exact text without visual token wrappers', await page.locator('.demo-code').textContent() === original
      && await page.locator('.demo-source-token').count() === 0);
    await page.getByRole('button', {name: 'Readable view', exact: true}).click();
    const evidence = await page.evaluate(async moduleUrl => {
      const {HtmlSourceView, PreviewDocument, BrowserConverter} = await import(moduleUrl);
      const source = '<!doctype html><html><head><style>p::before{content:"<literal>"}</style></head><body><!-- exact > comment --><p title="1 > 0">A <em>mixed</em> sentence.</p><math xmlns="http://www.w3.org/1998/Math/MathML"><mo> + </mo><mtext> a  b\n c </mtext><mi>x</mi></math><pre> a\n b\tc </pre><script>window.sourceExecuted=true</script></body></html>';
      const copy = {codeHelp: '', readableCode: 'Readable view', originalCode: 'Original source', copy: 'Copy HTML', copied: 'Copied', codeLimit: 'Limit'};
      const view = new HtmlSourceView(source, copy), container = view.render();
      const originalByDefault = view.code.dataset.mode === 'original' && view.code.textContent === source && !view.code.children.length;
      view.show('readable');
      container.className = 'demo-app'; container.style.position = 'fixed'; container.style.left = '-10000px'; document.body.append(container);
      const code = container.querySelector('.demo-code');
      const selection = document.getSelection(), range = document.createRange(); range.selectNodeContents(code); selection.removeAllRanges(); selection.addRange(range);
      const copyEvent = new ClipboardEvent('copy', {clipboardData: new DataTransfer(), bubbles: true, cancelable: true}); code.dispatchEvent(copyEvent);
      const copied = copyEvent.clipboardData.getData('text/plain'); selection.removeAllRanges();
      const artifact = html => ({html, assets: [], trustedReset: false});
      const preview = new PreviewDocument(artifact(source), []).build();
      const after = new PreviewDocument(artifact(code.textContent), []).build();
      const math = new DOMParser().parseFromString(after, 'text/html');
      const preserved = code.textContent === source, tokens = code.children.length, visualLines = getComputedStyle(code.firstElementChild).display === 'block';
      const limited = new HtmlSourceView('x'.repeat(1024 * 1024 + 1), copy); limited.render(); limited.show('readable');
      const limits = !limited.notice.hidden && limited.code.textContent.length === 1024 * 1024 + 1 && !limited.code.children.length;
      container.remove();
      const cleanup = [];
      for (const failure of ['identifier', 'constructor', 'postMessage', 'messageerror']) {
        let terminated = 0;
        const worker = {terminate() { terminated++; }, postMessage() { if (failure === 'postMessage') throw new Error('private implementation detail'); }};
        const converter = new BrowserConverter(new URL('./', moduleUrl), () => {},
          () => { if (failure === 'constructor') throw new Error('private implementation detail'); return worker; },
          () => { if (failure === 'identifier') throw new Error('private implementation detail'); return 'test-identifier'; });
        const result = converter.convert('private.pdf', new Uint8Array([1]));
        if (failure === 'messageerror') { worker.onmessageerror(); worker.onerror(); }
        const error = await result.catch(error => error);
        cleanup.push(error.code === 'engineError' && !error.message.includes('private') && converter.worker === null && converter.timer === null && converter.reject === null && terminated === (['identifier', 'constructor'].includes(failure) ? 0 : 1));
      }
      return {originalByDefault, preserved, copiedExactly: copied === source, tokens, visualLines, samePreview: preview === after,
        operator: math.querySelector('mo').textContent, mathText: math.querySelector('mtext').textContent,
        noExecution: !window.sourceExecuted, limits, cleanup};
    }, new URL('app.js', assetBase).href);
    check('HTML source opens in its original layout and formatting remains optional', evidence.originalByDefault);
    check('Readable HTML adds visual layout while preserving literal text and MathML whitespace', evidence.preserved && evidence.tokens > 10
      && evidence.visualLines && evidence.samePreview && evidence.operator === ' + ' && evidence.mathText === ' a  b\n c ');
    check('Copying a selection preserves source characters without visual line breaks', evidence.copiedExactly);
    check('Source inspection never executes embedded markup and bounds visual formatting', evidence.noExecution && evidence.limits);
    check('Missing identifier capability, Worker construction, transfer and deserialization failures release resources exactly once', evidence.cleanup.every(Boolean));
    record.sourcePresentation = evidence;
  }
  async widgetAppearances(page, frame, check, record) {
    const iframe = page.locator('iframe[title="Derived HTML"]');
    const viewport = page.viewportSize();
    const geometry = () => iframe.evaluate(element => {
      const {top, bottom} = element.getBoundingClientRect();
      return {top, bottom, viewportHeight: innerHeight, scrollY};
    });
    const evidence = record.widgetAppearances = {passed: false};
    try {
      // A short viewport reproduces the off-screen parent in both hosting layouts.
      await page.setViewportSize({width: viewport.width, height: 200});
      await page.evaluate(() => window.scrollTo({top: 0, left: 0, behavior: 'instant'}));
      evidence.before = await geometry();
      check('Widget regression starts with its parent iframe outside the viewport',
        evidence.before.top >= evidence.before.viewportHeight || evidence.before.bottom <= 0);
      await iframe.scrollIntoViewIfNeeded();
      evidence.after = await geometry();
      check('The parent iframe is scrolled into view before interacting with its widget',
        evidence.after.top < evidence.after.viewportHeight && evidence.after.bottom > 0);
    } finally { await page.setViewportSize(viewport); }
    await iframe.scrollIntoViewIfNeeded();
    const button = frame.locator('button').first();
    await button.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0);
    const normal = await button.screenshot(); await button.hover(); const hover = await button.screenshot();
    await page.mouse.down(); const pressed = await button.screenshot(); await page.mouse.up();
    check('Normal, hover and pressed widget appearances are visibly different',
      !normal.equals(hover) && !hover.equals(pressed) && !normal.equals(pressed));
    evidence.sha256 = Object.fromEntries(Object.entries({normal, hover, pressed})
      .map(([state, bytes]) => [state, crypto.createHash('sha256').update(bytes).digest('hex')]));
    evidence.passed = true;
  }
  async imageImports(page, context, manifest, galleryBase, requests, check, screenshot, record) {
    record.imageCodecs = [];
    for (const id of ['jpeg', 'jpeg2000', 'jbig2']) {
      const sample = manifest.cases.find(item => item.id === id);
      assert.ok(sample && sample.profile === 'basic' && sample.capabilities.includes('pure-php-image-codecs'));
      const pdf = await (await context.request.get(new URL(sample.files.pdf.path, galleryBase).href)).body();
      const html = await (await context.request.get(new URL(sample.files.html.path, galleryBase).href)).text();
      const requestStart = requests.length;
      const started = performance.now();
      const conversion = {id, startedAt: new Date().toISOString(), passed: false};
      record.imageCodecs.push(conversion);
      await page.locator('input[type=file]').setInputFiles({name: id + '.pdf', mimeType: 'application/pdf', buffer: pdf});
      try {
        await page.waitForFunction(() => {
          const status = document.querySelector('.demo-status');
          return status?.dataset.error === 'true' || status?.textContent.includes('Conversion complete');
        }, null, {timeout: 45000});
      } finally {
        conversion.elapsedMs = Math.round(performance.now() - started);
        conversion.status = await page.locator('.demo-status').textContent();
        conversion.error = await page.locator('.demo-status').getAttribute('data-error') === 'true';
      }
      assert.ok(!conversion.error && conversion.status.includes('Conversion complete'),
        id + ': conversion must finish within the unchanged 30-second Worker budget: ' + conversion.status);
      await page.getByRole('tab', {name: 'HTML code', exact: true}).click();
      assert.equal(await page.locator('.demo-code').textContent(), html);
      check(id + ': real WebAssembly decoding produces byte-identical native HTML');
      const event = page.waitForEvent('download');
      await page.getByRole('button', {name: 'Download HTML + assets', exact: true}).click();
      const download = await event;
      const zip = unzipSync(await fs.readFile(await download.path()));
      assert.equal(Buffer.from(zip['document.html']).toString(), html);
      const hashes = [];
      for (const asset of sample.files.assets) {
        const expected = await (await context.request.get(new URL(asset.path, galleryBase).href)).body();
        const filename = asset.path.split('/').at(-1);
        assert.deepEqual(Buffer.from(zip[filename]), expected);
        hashes.push({filename, sha256: crypto.createHash('sha256').update(expected).digest('hex')});
      }
      check(id + ': downloaded PNG assets exactly match the independent native conversion');
      await page.getByRole('tab', {name: 'HTML result', exact: true}).click();
      const frame = page.frameLocator('iframe[title="Derived HTML"]');
      const pixels = await frame.locator('img').evaluate(async image => {
        await image.decode(); return {width: image.naturalWidth, height: image.naturalHeight};
      });
      const dimensions = id === 'jpeg2000' ? [160, 80] : [320, 160];
      check(id + ': browser displays the exact native decoded dimensions',
        pixels.width === dimensions[0] && pixels.height === dimensions[1]
        && pixels.width === sample.expected.image.width && pixels.height === sample.expected.image.height);
      check(id + ': no source bytes or filenames leave the page', requests.slice(requestStart).every(request => request.method === 'GET' && !request.body && new URL(request.url).origin === this.base.origin && !request.url.includes(id + '.pdf')));
      await screenshot('wasm-' + id);
      Object.assign(conversion, {nativeHtmlSha256: crypto.createHash('sha256').update(html).digest('hex'), assets: hashes, passed: true});
    }
  }
  async startupChecks(context, en, fr, pdf, check, record, browserName) {
    record.startupFailures = [];
    for (const [language, url, messages] of [
      ['en', en, ['The local conversion engine could not load or run.', 'A file needed by the local converter could not be downloaded.', 'A downloaded converter file did not match the expected version.']],
      ['fr', fr, ['Le moteur de conversion local n’a pas pu se charger ou s’exécuter.', 'Un fichier nécessaire au convertisseur local n’a pas pu être téléchargé.', 'Un fichier téléchargé du convertisseur ne correspond pas à la version attendue.']],
    ]) {
      for (const [index, scenario] of ['worker', 'download', 'integrity'].entries()) {
      const page = await context.newPage();
      const requests = [];
      page.on('request', request => requests.push({url: request.url(), method: request.method(), body: request.postData()}));
      try {
        if (scenario === 'worker') await page.route('**/assets/conversion-worker.js', route => route.abort('blockedbyclient'));
        if (scenario === 'download') await page.route('**/assets/runtime-manifest.json', route => route.fulfill({status: 404, body: 'Missing runtime'}));
        if (scenario === 'integrity') await page.route('**/assets/runtime/*/php_8_3.js', route => route.fulfill({status: 200, contentType: 'text/javascript', body: 'fetch("/must-not-execute-corrupt-runtime")'}));
        await page.goto(url.href);
        await page.locator('.demo-sample').first().waitFor();
        await page.locator('input[type=file]').setInputFiles({name: 'private-startup-test.pdf', mimeType: 'application/pdf', buffer: pdf});
        await page.waitForFunction(() => document.querySelector('.demo-status')?.dataset.error === 'true');
        const status = await page.locator('.demo-status').textContent();
        check(language + ': ' + scenario + ' failure reports its own localized cause without exposing runtime errors',
          status.startsWith(messages[index]) && !status.includes('private-startup-test') && !status.includes('current version')
          && await page.locator('[data-demo-root]').getAttribute('aria-busy') === 'false'
          && await page.locator('.demo-workspace iframe').count() === 0
          && requests.every(request => request.method === 'GET' && !request.body && !request.url.includes('must-not-execute') && !request.url.includes('private-startup-test')));
        const filename = browserName + '-startup-' + language + '-' + scenario + '.png';
        await page.screenshot({path: path.join(this.output, filename), fullPage: true});
        record.screenshots.push(filename);
        record.startupFailures.push({language, scenario, status, passed: true});
      } finally { await page.close(); }
      }
    }
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
