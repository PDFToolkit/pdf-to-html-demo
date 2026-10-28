const COPY = {
  en: {
    eyebrow: 'PDFToolkit · live demonstration', title: 'From a PDF to a page you can use.',
    intro: 'Compare real source PDFs with their semantic HTML. Explore the examples, or convert a tagged PDF of your own.',
    private: 'Your PDF stays in this browser', upload: 'Try your own tagged PDF',
    uploadHelp: 'Drop a PDF here, or choose a file. Up to 8 MiB. No upload, no account.',
    choose: 'Choose a PDF', cancel: 'Cancel', clear: 'Clear my file',
    idle: 'The conversion engine loads only when you choose a file.',
    samples: 'Explore the examples', samplesHint: 'Real PDFs · real converter output',
    loading: 'Loading the example…', 'loading-runtime': 'Loading PHP for your browser…',
    'loading-library': 'Preparing the converter…', converting: 'Converting your PDF locally…',
    complete: 'Conversion complete. Your file has not left this browser.', cancelled: 'Conversion cancelled.',
    tooLarge: 'Choose a PDF smaller than 8 MiB.', notPdf: 'This file does not appear to be a PDF.',
    timeout: 'This document exceeded the 30-second limit. Try a smaller or simpler tagged PDF.',
    loadError: 'The example could not be loaded. Reload the page to try again.',
    engineError: 'The conversion engine could not start. Please use a current version of Chromium or Firefox.',
    conversionError: 'This PDF could not be converted with the demonstration profile.',
    compare: 'Compare', html: 'HTML result', pdf: 'Source PDF', code: 'HTML code', diagnostics: 'Diagnostics',
    source: 'Source PDF', result: 'Derived HTML', semantic: 'Semantic, reflowable content',
    downloadPdf: 'Download PDF', downloadHtml: 'Download HTML + assets', copy: 'Copy HTML', copied: 'Copied',
    observe: 'What to try', inputLabel: 'Your document', inputDescription: 'Converted now in your browser with the default safe profile.',
    noDiagnostics: 'No diagnostics were reported for this conversion.',
    diagnosticHelp: 'These messages describe omissions, adaptations or unsupported features in this particular conversion.',
    provenance: 'Reproduce this example', generator: 'View the generating PHP code',
    generated: 'Pre-generated with PDFToolkit', live: 'Converted in your browser',
    version: 'HTML converter', elapsed: 'Conversion time', bytes: 'Source size',
    boundary: 'This converts tagged PDF structure into HTML. It is not OCR or a page-layout replica. PDF scripts and remote resources are disabled for your files; missing graphics capabilities are reported in the diagnostics.',
    profileBasic: 'Default safe profile', profileReset: 'Library-owned form reset enabled',
    profileSignature: 'Chosen test certificate · integrity check', profileRendering: 'Explicit Poppler rendering',
    advanced: 'This example includes an explicitly configured capability. Importing its PDF with the default browser profile may produce a different result; see the diagnostics.',
    empty: 'Choose an example or a tagged PDF to begin.', resetNote: 'Change a field, then use the reset control inside the result.',
    untagged: 'This PDF has no usable tagged structure. Try a tagged PDF; this demo does not infer reading order or run OCR.',
    encrypted: 'This PDF is encrypted. This browser demo does not ask for credentials; use the documented authentication API in your application.',
    unavailable: 'The conversion was rejected by the configured resource limits or the supported input profile.',
    codeHelp: 'This is the exact HTML returned by the converter. The preview is isolated; downloads include the original HTML and its assets.',
    sourceHelp: 'Use Download PDF to open your original file in a PDF reader. The converted content is available in the HTML result tab.', sourceLink: 'Source and reproduction instructions',
    previewLimit: 'This result is too large for the isolated preview. You can still inspect its HTML code and download the original HTML with its assets.',
  },
  fr: {
    eyebrow: 'PDFToolkit · démonstration interactive', title: 'Du PDF à une page que l’on peut utiliser.',
    intro: 'Comparez de vrais PDF sources avec leur HTML sémantique. Explorez les exemples ou convertissez votre propre PDF balisé.',
    private: 'Votre PDF reste dans ce navigateur', upload: 'Essayez votre propre PDF balisé',
    uploadHelp: 'Déposez un PDF ici ou choisissez un fichier. Jusqu’à 8 Mio. Aucun envoi, aucun compte.',
    choose: 'Choisir un PDF', cancel: 'Annuler', clear: 'Effacer mon fichier',
    idle: 'Le moteur de conversion se charge uniquement lorsque vous choisissez un fichier.',
    samples: 'Explorer les exemples', samplesHint: 'De vrais PDF · du HTML réellement dérivé',
    loading: 'Chargement de l’exemple…', 'loading-runtime': 'Chargement de PHP pour votre navigateur…',
    'loading-library': 'Préparation du convertisseur…', converting: 'Conversion locale de votre PDF…',
    complete: 'Conversion terminée. Votre fichier n’a pas quitté ce navigateur.', cancelled: 'Conversion annulée.',
    tooLarge: 'Choisissez un PDF de moins de 8 Mio.', notPdf: 'Ce fichier ne semble pas être un PDF.',
    timeout: 'Ce document a dépassé la limite de 30 secondes. Essayez un PDF balisé plus petit ou plus simple.',
    loadError: 'Impossible de charger cet exemple. Rechargez la page pour réessayer.',
    engineError: 'Le moteur de conversion n’a pas pu démarrer. Utilisez une version récente de Chromium ou Firefox.',
    conversionError: 'Ce PDF n’a pas pu être converti avec le profil de démonstration.',
    compare: 'Comparer', html: 'Résultat HTML', pdf: 'PDF source', code: 'Code HTML', diagnostics: 'Diagnostics',
    source: 'PDF source', result: 'HTML dérivé', semantic: 'Contenu sémantique et adaptable',
    downloadPdf: 'Télécharger le PDF', downloadHtml: 'Télécharger HTML + ressources', copy: 'Copier le HTML', copied: 'Copié',
    observe: 'À essayer', inputLabel: 'Votre document', inputDescription: 'Converti maintenant dans votre navigateur avec le profil sûr par défaut.',
    noDiagnostics: 'Aucun diagnostic signalé pour cette conversion.',
    diagnosticHelp: 'Ces messages décrivent les omissions, adaptations ou fonctions non prises en charge pour cette conversion précise.',
    provenance: 'Reproduire cet exemple', generator: 'Voir le code PHP de génération',
    generated: 'Pré-généré avec PDFToolkit', live: 'Converti dans votre navigateur',
    version: 'Convertisseur HTML', elapsed: 'Temps de conversion', bytes: 'Taille de la source',
    boundary: 'Le convertisseur transforme la structure d’un PDF balisé en HTML. Il ne fait ni OCR ni reproduction de la mise en page. Les scripts PDF et ressources distantes sont désactivés pour vos fichiers ; les capacités graphiques manquantes sont signalées dans les diagnostics.',
    profileBasic: 'Profil sûr par défaut', profileReset: 'Réinitialisation gérée par la bibliothèque',
    profileSignature: 'Certificat de test choisi · contrôle d’intégrité', profileRendering: 'Rendu Poppler explicitement configuré',
    advanced: 'Cet exemple utilise une capacité explicitement configurée. Importer son PDF avec le profil navigateur par défaut peut produire un autre résultat ; consultez les diagnostics.',
    empty: 'Choisissez un exemple ou un PDF balisé pour commencer.', resetNote: 'Modifiez un champ, puis utilisez le bouton de réinitialisation dans le résultat.',
    untagged: 'Ce PDF ne possède pas de structure balisée exploitable. Essayez un PDF balisé ; cette démo ne déduit pas l’ordre de lecture et ne fait pas d’OCR.',
    encrypted: 'Ce PDF est chiffré. Cette démo ne demande pas d’identifiants ; utilisez l’API d’authentification documentée dans votre application.',
    unavailable: 'La conversion a été refusée par les limites de ressources ou le profil de fichiers pris en charge.',
    codeHelp: 'Voici le HTML exact renvoyé par le convertisseur. L’aperçu est isolé ; le téléchargement contient le HTML original et ses ressources.',
    sourceHelp: 'Utilisez Télécharger le PDF pour ouvrir votre fichier original dans un lecteur PDF. Le contenu converti est disponible dans l’onglet Résultat HTML.', sourceLink: 'Sources et instructions de reproduction',
    previewLimit: 'Ce résultat est trop volumineux pour l’aperçu isolé. Vous pouvez consulter son code HTML et télécharger le HTML original avec ses ressources.',
  },
};

export class DemoAsset {
  constructor(base, record) {
    if (!record || typeof record.path !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(record.path)
        || record.path.split('/').some(part => part === '.' || part === '..' || part === '')
        || !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.bytes) || record.bytes < 0 || record.bytes > 32 * 1024 * 1024) {
      throw new Error('Invalid example asset inventory');
    }
    this.url = new URL(record.path, base);
    this.record = record;
  }
  async read(signal) {
    const response = await fetch(this.url, {signal, credentials: 'omit', redirect: 'error'});
    if (!response.ok) throw new Error('Example asset unavailable');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== this.record.bytes) throw new Error('Example asset size mismatch');
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
    if (hash !== this.record.sha256) throw new Error('Example asset hash mismatch');
    return bytes;
  }
}

export class PreviewDocument {
  constructor(artifact, urls) {
    this.artifact = artifact;
    this.urls = urls;
    this.remainingCharacters = 16 * 1024 * 1024;
  }
  build() {
    // Reserve the source, DOM and serialization before constructing the preview.
    this.reserve(this.artifact.html.length * 3);
    const document = new DOMParser().parseFromString(this.artifact.html, 'text/html');
    const assets = new Map(this.artifact.assets.map(asset => [asset.filename, asset]));
    const mapped = new Map();
    for (const asset of assets.values()) {
      mapped.set(asset.filename, this.dataUrl(asset.bytes, asset.mediaType));
    }
    const remapCss = css => css.replace(/url\(\s*(['"]?)([A-Za-z0-9_.-]+)\1\s*\)/gi,
      (match, quote, filename) => {
        if (!mapped.has(filename)) return match;
        this.reserve(mapped.get(filename).length + 7);
        return 'url("' + mapped.get(filename) + '")';
      });
    for (const asset of assets.values()) {
      if (asset.mediaType !== 'text/css') continue;
      const css = remapCss(new TextDecoder().decode(asset.bytes));
      mapped.set(asset.filename, this.dataUrl(new TextEncoder().encode(css), 'text/css'));
    }
    document.querySelectorAll('base,meta[http-equiv],iframe,object,embed').forEach(node => node.remove());
    for (const node of document.querySelectorAll('*')) {
      for (const attribute of [...node.attributes]) {
        if (/^on/i.test(attribute.name) || ['action', 'formaction', 'ping', 'target', 'srcdoc'].includes(attribute.name)) node.removeAttribute(attribute.name);
      }
      for (const attribute of ['src', 'href', 'poster', 'xlink:href']) {
        if (!node.hasAttribute(attribute)) continue;
        const value = node.getAttribute(attribute);
        if (mapped.has(value)) { this.reserve(mapped.get(value).length); node.setAttribute(attribute, mapped.get(value)); }
        else if (!value.startsWith('#') && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(value)) node.removeAttribute(attribute);
      }
      node.removeAttribute('srcset');
    }
    for (const style of document.querySelectorAll('style')) style.textContent = remapCss(style.textContent);
    for (const node of document.querySelectorAll('[style]')) node.setAttribute('style', remapCss(node.getAttribute('style')));
    const scriptHashes = [];
    for (const script of document.querySelectorAll('script')) {
      const original = [...mapped.entries()].find(([, url]) => url === script.getAttribute('src'));
      if (!this.artifact.trustedReset || !original || !['application/javascript', 'text/javascript'].includes(assets.get(original[0]).mediaType)
          || !/^pdf-script-[a-f0-9]{64}\.js$/.test(original[0])) { script.remove(); continue; }
      const hash = original[0].slice('pdf-script-'.length, -3);
      scriptHashes.push("'sha256-" + btoa(String.fromCharCode(...hash.match(/../g).map(pair => parseInt(pair, 16)))) + "'");
      script.removeAttribute('src');
      script.textContent = new TextDecoder().decode(assets.get(original[0]).bytes);
    }
    for (const link of document.querySelectorAll('link')) {
      if (link.rel !== 'stylesheet' || ![...mapped.values()].includes(link.href)) link.remove();
    }
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'none'; img-src data:; style-src 'unsafe-inline' data:; font-src data:; script-src "
      + (scriptHashes.length ? scriptHashes.join(' ') : "'none'") + "; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
    document.head.prepend(csp);
    return '<!doctype html>\n' + document.documentElement.outerHTML;
  }
  dataUrl(bytes, mediaType) {
    this.reserve(Math.ceil(bytes.length / 3) * 4 + mediaType.length + 16);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return 'data:' + mediaType + ';base64,' + btoa(binary);
  }
  reserve(characters) {
    if (!Number.isSafeInteger(characters) || characters < 0 || characters > this.remainingCharacters) {
      throw Object.assign(new Error('Preview expansion limit exceeded'), {code: 'preview_limit'});
    }
    this.remainingCharacters -= characters;
  }
}

export class BrowserConverter {
  constructor(base, onProgress) {
    this.base = base;
    this.onProgress = onProgress;
    this.worker = null;
    this.reject = null;
    this.timer = null;
  }
  cancel() {
    clearTimeout(this.timer);
    this.worker?.terminate();
    this.worker = null;
    const reject = this.reject;
    this.reject = null;
    reject?.(Object.assign(new Error('Cancelled'), {code: 'cancelled'}));
  }
  convert(filename, bytes) {
    this.cancel();
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.reject = reject;
      const worker = new Worker(new URL('assets/conversion-worker.js', this.base), {type: 'module'});
      this.worker = worker;
      const finish = (error, result) => {
        clearTimeout(this.timer);
        worker.terminate();
        if (this.worker === worker) { this.worker = null; this.reject = null; }
        if (error) reject(error); else resolve(result);
      };
      this.timer = setTimeout(() => finish(Object.assign(new Error('Timeout'), {code: 'timeout'})), 30000);
      worker.onerror = () => finish(Object.assign(new Error('Worker failed'), {code: 'engineError'}));
      worker.onmessage = ({data}) => {
        if (!data || data.id !== id) return;
        if (data.type === 'progress') this.onProgress(data.stage);
        else if (data.type === 'error') finish(Object.assign(new Error(data.error?.message || 'Conversion failed'), {code: data.error?.code || 'conversionError'}));
        else if (data.type === 'result') finish(null, data);
      };
      const input = bytes.slice().buffer;
      worker.postMessage({type: 'convert', id, filename, input}, [input]);
    });
  }
}

class DemoApplication {
  constructor(root) {
    this.root = root;
    this.language = root.dataset.demoLanguage === 'fr' ? 'fr' : 'en';
    this.t = COPY[this.language];
    this.base = new URL(root.dataset.demoBase || './', location.href);
    this.galleryBase = new URL('gallery/', this.base);
    this.urls = [];
    this.generation = 0;
    this.artifact = null;
    this.selectedTab = 'compare';
    this.controller = null;
    this.converter = new BrowserConverter(this.base, stage => this.status(this.t[stage] || this.t.converting, true));
  }
  element(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  button(text, className, handler) {
    const button = this.element('button', 'demo-button ' + (className || ''), text);
    button.type = 'button';
    button.addEventListener('click', handler);
    return button;
  }
  async start() {
    this.root.replaceChildren();
    const intro = this.element('div', 'demo-intro');
    const heading = this.element('div');
    heading.append(this.element('span', 'demo-eyebrow', this.t.eyebrow), this.element('h2', '', this.t.title), this.element('p', '', this.t.intro));
    intro.append(heading, this.element('span', 'demo-private', '● ' + this.t.private));
    const upload = this.element('div', 'demo-upload');
    const copy = this.element('div', 'demo-upload-copy');
    copy.append(this.element('strong', '', this.t.upload), this.element('p', '', this.t.uploadHelp));
    this.input = this.element('input', 'demo-hidden');
    this.input.type = 'file'; this.input.accept = 'application/pdf,.pdf'; this.input.setAttribute('aria-label', this.t.choose);
    this.input.addEventListener('change', () => { const file = this.input.files[0]; if (file) this.importFile(file); });
    this.choose = this.button(this.t.choose, 'demo-primary', () => this.input.click());
    this.cancelButton = this.button(this.t.cancel, '', () => { this.stop(); this.status(this.t.cancelled); });
    this.cancelButton.hidden = true;
    this.clearButton = this.button(this.t.clear, '', () => this.clear()); this.clearButton.hidden = true;
    this.statusNode = this.element('div', 'demo-status');
    this.statusNode.setAttribute('role', 'status'); this.statusNode.setAttribute('aria-live', 'polite');
    upload.append(this.element('span', 'demo-upload-mark', 'PDF'), copy, this.input, this.choose, this.cancelButton, this.clearButton, this.statusNode);
    for (const type of ['dragenter', 'dragover']) upload.addEventListener(type, event => { event.preventDefault(); upload.dataset.dragging = 'true'; });
    upload.addEventListener('dragleave', event => { if (!upload.contains(event.relatedTarget)) upload.dataset.dragging = 'false'; });
    upload.addEventListener('drop', event => { event.preventDefault(); upload.dataset.dragging = 'false'; const file = event.dataTransfer.files[0]; if (file) this.importFile(file); });
    const sampleHeading = this.element('div', 'demo-section-heading');
    sampleHeading.append(this.element('h3', '', this.t.samples), this.element('span', '', this.t.samplesHint));
    this.samples = this.element('div', 'demo-samples');
    this.samples.setAttribute('aria-label', this.t.samples);
    this.workspace = this.element('section', 'demo-workspace'); this.workspace.setAttribute('aria-label', this.t.result);
    this.workspace.append(this.element('p', 'demo-empty', this.t.empty));
    this.root.append(intro, upload, sampleHeading, this.samples, this.workspace, this.element('p', 'demo-boundary', this.t.boundary));
    this.status(this.t.idle);
    const generation = this.generation;
    try {
      const response = await fetch(new URL('gallery-manifest.json', this.galleryBase), {credentials: 'omit', redirect: 'error'});
      if (!response.ok) throw new Error('Manifest unavailable');
      this.manifest = await response.json();
      if (this.manifest.schemaVersion !== 1 || !Array.isArray(this.manifest.cases) || this.manifest.cases.length > 30) throw new Error('Invalid manifest');
      this.manifest.cases.forEach((sample, index) => {
        if (!/^[a-z0-9][a-z0-9-]+$/.test(sample.id)) throw new Error('Invalid sample identifier');
        const button = this.element('button', 'demo-sample'); button.type = 'button'; button.dataset.sample = sample.id; button.setAttribute('aria-pressed', 'false');
        button.append(this.element('span', 'demo-sample-number', String(index + 1).padStart(2, '0')),
          this.element('strong', '', sample.title[this.language]), this.element('span', '', sample.description[this.language]));
        button.addEventListener('click', () => this.loadSample(sample)); this.samples.append(button);
      });
      const requested = new URL(location.href).searchParams.get('sample');
      if (generation === this.generation) await this.loadSample(this.manifest.cases.find(sample => sample.id === requested) || this.manifest.cases[0], false);
    } catch (error) { if (generation === this.generation) this.status(this.t.loadError, false, true); }
  }
  status(message, busy = false, error = false) {
    this.statusNode.replaceChildren();
    const text = this.element('p');
    if (busy) text.append(this.element('span', 'demo-spinner'));
    text.append(document.createTextNode(message)); this.statusNode.append(text);
    this.statusNode.dataset.error = String(error); this.cancelButton.hidden = !busy;
    this.root.setAttribute('aria-busy', String(busy));
  }
  stop() {
    this.generation++;
    this.converter.cancel(); this.controller?.abort(); this.controller = null;
  }
  releasePreview() { for (const url of this.urls) URL.revokeObjectURL(url); this.urls = []; }
  clear() {
    this.stop(); this.releasePreview(); this.artifact = null; this.input.value = ''; this.clearButton.hidden = true;
    this.samples.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    this.workspace.replaceChildren(this.element('p', 'demo-empty', this.t.empty)); this.status(this.t.idle);
  }
  async loadSample(sample, updateUrl = true) {
    if (!sample) return;
    this.stop(); const generation = this.generation; this.controller = new AbortController(); const signal = this.controller.signal;
    this.input.value = '';
    this.status(this.t.loading, true); this.clearButton.hidden = true;
    try {
      const read = record => new DemoAsset(this.galleryBase, record).read(signal);
      const files = sample.files;
      const pages = sample.pages?.length ? sample.pages : [files.preview];
      const [html, pdf, diagnostics, code, previews, assets] = await Promise.all([
        read(files.html), read(files.pdf), read(files.diagnostics), read(files.code),
        Promise.all(pages.map(async record => ({bytes: await read(record), mediaType: record.mediaType || 'image/png'}))),
        Promise.all((files.assets || []).map(async record => ({filename: record.filename || record.path.split('/').pop(), mediaType: record.mediaType, bytes: await read(record)}))),
      ]);
      if (this.generation !== generation) return;
      let messages = JSON.parse(new TextDecoder().decode(diagnostics));
      if (!Array.isArray(messages)) messages = messages.diagnostics || [];
      this.artifact = {sample, title: sample.title[this.language], description: sample.description[this.language],
        html: new TextDecoder().decode(html), pdf, filename: sample.id + '.pdf', diagnostics: messages, assets,
        previews, code: new TextDecoder().decode(code), trustedReset: sample.profile === 'reset',
        version: this.manifest.htmlPackage?.version || this.manifest.runtime?.pdfToHtmlVersion || '0.7.0'};
      this.samples.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sample === sample.id)));
      this.selectedTab = 'compare'; this.renderArtifact(); this.status(this.t.idle);
      if (updateUrl) { const url = new URL(location.href); url.searchParams.set('sample', sample.id); history.replaceState(null, '', url); }
    } catch (error) { if (generation === this.generation && error.name !== 'AbortError') this.status(this.t.loadError, false, true); }
  }
  async importFile(file) {
    this.stop(); const generation = this.generation;
    this.releasePreview(); this.artifact = null;
    this.workspace.replaceChildren(this.element('p', 'demo-empty', this.t.converting));
    this.samples.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    this.clearButton.hidden = false;
    if (file.size > 8 * 1024 * 1024) { this.status(this.t.tooLarge, false, true); return; }
    this.status(this.t['loading-runtime'], true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (generation !== this.generation) return;
      if (!new TextDecoder().decode(bytes.slice(0, 1024)).includes('%PDF-')) throw Object.assign(new Error('Not PDF'), {code: 'notPdf'});
      const response = await this.converter.convert(file.name, bytes);
      if (generation !== this.generation) return;
      const result = response.result;
      if (typeof result.html !== 'string' || !Array.isArray(result.assets) || !Array.isArray(result.diagnostics)) throw new Error('Invalid conversion result');
      const assets = result.assets.map(asset => {
        if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(asset.filename) || asset.filename.includes('..')) throw new Error('Invalid asset filename');
        return {filename: asset.filename, mediaType: asset.mediaType, bytes: Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0))};
      });
      this.artifact = {title: file.name, description: this.t.inputDescription, html: result.html, assets, diagnostics: result.diagnostics,
        filename: file.name, pdf: bytes, previews: [], trustedReset: false, version: '0.7.0', durationMs: response.meta?.durationMs};
      this.selectedTab = 'html'; this.renderArtifact(); this.status(this.t.complete);
    } catch (error) {
      if (generation !== this.generation || error.code === 'cancelled') return;
      const code = ({untagged_pdf: 'untagged', encrypted_pdf: 'encrypted', resource_limit: 'unavailable', unsupported_pdf: 'unavailable', runtime_unavailable: 'engineError', file_size: 'tooLarge', invalid_pdf: 'notPdf'})[error.code] || error.code;
      this.status(this.t[code] || this.t.conversionError, false, true);
    }
  }
  blob(bytes, type) { const url = URL.createObjectURL(new Blob([bytes], {type})); this.urls.push(url); return url; }
  renderArtifact() {
    this.releasePreview(); const artifact = this.artifact; this.workspace.replaceChildren();
    const header = this.element('div', 'demo-workspace-header'); const heading = this.element('div');
    heading.append(this.element('h3', '', artifact.title), this.element('p', '', artifact.description));
    const actions = this.element('div', 'demo-actions');
    actions.append(this.button(this.t.downloadPdf, '', () => this.download(artifact.pdf, 'application/pdf', artifact.filename)),
      this.button(this.t.downloadHtml, '', event => this.downloadBundle(event.currentTarget)));
    header.append(heading, actions);
    const tabs = this.element('div', 'demo-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', this.t.result);
    const names = ['compare', 'html', 'pdf', 'code', 'diagnostics'];
    names.forEach((name, index) => {
      const label = this.t[name] + (name === 'diagnostics' ? ' (' + artifact.diagnostics.length + ')' : '');
      const button = this.element('button', 'demo-tab', label); button.type = 'button'; button.id = 'demo-tab-' + name;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'demo-panel');
      button.setAttribute('aria-selected', String(this.selectedTab === name)); button.tabIndex = this.selectedTab === name ? 0 : -1;
      button.addEventListener('click', () => this.selectTab(name));
      button.addEventListener('keydown', event => {
        let next = null;
        if (event.key === 'ArrowRight') next = (index + 1) % names.length;
        if (event.key === 'ArrowLeft') next = (index + names.length - 1) % names.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = names.length - 1;
        if (next !== null) { event.preventDefault(); this.selectTab(names[next]); tabs.children[next].focus(); }
      });
      tabs.append(button);
    });
    this.panels = this.element('div', 'demo-panels'); this.panels.id = 'demo-panel'; this.panels.setAttribute('role', 'tabpanel'); this.panels.tabIndex = 0;
    const facts = this.element('div', 'demo-facts');
    facts.append(this.element('span', '', artifact.sample ? this.t.generated : this.t.live),
      this.element('span', '', this.t.version + ' ' + artifact.version), this.element('span', '', this.t.bytes + ': ' + this.size(artifact.pdf.length)));
    const profile = {basic: 'profileBasic', reset: 'profileReset', signature: 'profileSignature', rendering: 'profileRendering'}[artifact.sample?.profile || 'basic'];
    if (profile) facts.append(this.element('span', '', this.t[profile]));
    if (Number.isFinite(artifact.durationMs)) facts.append(this.element('span', '', this.t.elapsed + ': ' + (artifact.durationMs / 1000).toFixed(2) + ' s'));
    this.workspace.append(header, tabs, this.panels, facts);
    if (artifact.sample) {
      const notes = this.element('div', 'demo-notes'); notes.append(this.element('strong', '', this.t.observe));
      const list = this.element('ul');
      for (const observation of artifact.sample.observations?.[this.language] || []) list.append(this.element('li', '', observation));
      if (artifact.sample.profile !== 'basic') list.append(this.element('li', '', this.t.advanced));
      notes.append(list); this.workspace.append(notes);
    }
    this.selectTab(this.selectedTab);
  }
  size(bytes) { return new Intl.NumberFormat(this.language, {maximumFractionDigits: 1}).format(bytes / 1024) + (this.language === 'fr' ? ' Kio' : ' KiB'); }
  selectTab(name) {
    this.selectedTab = name;
    this.workspace.querySelectorAll('[role=tab]').forEach(button => { const active = button.id === 'demo-tab-' + name; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; });
    this.panels.replaceChildren(); this.releasePreview(); this.panels.setAttribute('aria-labelledby', 'demo-tab-' + name);
    if (name === 'compare') { const panes = this.element('div', 'demo-compare'); panes.append(this.pdfPane(), this.htmlPane()); this.panels.append(panes); }
    if (name === 'html') this.panels.append(this.htmlPane());
    if (name === 'pdf') this.panels.append(this.pdfPane());
    if (name === 'code') {
      const actions = this.element('div', 'demo-inspection'); actions.style.minHeight = '0';
      actions.append(this.element('p', '', this.t.codeHelp), this.button(this.t.copy, '', async event => {
        const button = event.currentTarget;
        try { await navigator.clipboard.writeText(this.artifact.html); button.textContent = this.t.copied; } catch { /* The selectable code remains available. */ }
      }));
      this.panels.append(actions, this.element('pre', 'demo-code', this.artifact.html));
    }
    if (name === 'diagnostics') this.diagnosticsPane();
  }
  pdfPane() {
    const pane = this.element('div', 'demo-pane'); pane.append(this.element('div', 'demo-pane-label', this.t.source));
    if (this.artifact.previews.length) {
      const pages = this.element('div', 'demo-pdf-pages');
      this.artifact.previews.forEach((preview, index) => { const img = this.element('img'); img.src = this.blob(preview.bytes, preview.mediaType); img.alt = this.t.source + ' — ' + (index + 1); img.loading = 'lazy'; pages.append(img); });
      pane.append(pages);
    } else {
      const source = this.element('div', 'demo-inspection demo-source-file');
      source.append(this.element('strong', '', this.artifact.filename), this.element('p', '', this.t.sourceHelp),
        this.button(this.t.downloadPdf, '', () => this.download(this.artifact.pdf, 'application/pdf', this.artifact.filename)));
      pane.append(source);
    }
    return pane;
  }
  htmlPane() {
    const pane = this.element('div', 'demo-pane'); const label = this.element('div', 'demo-pane-label');
    label.append(document.createTextNode(this.t.result), this.element('span', '', this.t.semantic)); pane.append(label);
    const frame = this.element('iframe', 'demo-result-frame'); frame.title = this.t.result;
    frame.setAttribute('sandbox', this.artifact.trustedReset ? 'allow-scripts' : ''); frame.referrerPolicy = 'no-referrer';
    try { frame.srcdoc = new PreviewDocument(this.artifact, this.urls).build(); pane.append(frame); }
    catch (error) {
      const message = this.element('p', 'demo-inspection', error.code === 'preview_limit' ? this.t.previewLimit : this.t.loadError);
      message.setAttribute('role', 'status'); pane.append(message);
    }
    return pane;
  }
  diagnosticsPane() {
    const section = this.element('div', 'demo-inspection'); section.append(this.element('h4', '', this.t.diagnostics));
    section.append(this.element('p', '', this.artifact.diagnostics.length ? this.t.diagnosticHelp : this.t.noDiagnostics));
    const messages = this.element('ul', 'demo-diagnostics');
    for (const diagnostic of this.artifact.diagnostics) {
      const item = this.element('li'); item.append(this.element('code', '', diagnostic.code || diagnostic.type || 'diagnostic'),
        this.element('p', '', diagnostic.message || JSON.stringify(diagnostic))); messages.append(item);
    }
    section.append(messages);
    if (this.artifact.code) {
      section.append(this.element('h4', '', this.t.provenance));
      const details = this.element('details'); details.append(this.element('summary', '', this.t.generator), this.element('pre', 'demo-code', this.artifact.code)); section.append(details);
    }
    this.panels.append(section);
  }
  download(bytes, mediaType, filename) {
    const url = URL.createObjectURL(new Blob([bytes], {type: mediaType})); const link = document.createElement('a');
    link.href = url; link.download = filename.replace(/[/\\\u0000-\u001f]/g, '_'); document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async downloadBundle(button) {
    const artifact = this.artifact, generation = this.generation;
    if (!artifact) return;
    button.disabled = true;
    try {
      const {zipSync} = await import('./assets/fflate.js'); const encoder = new TextEncoder(); const files = Object.create(null);
      if (generation !== this.generation) return;
      files['document.html'] = encoder.encode(artifact.html);
      files['diagnostics.json'] = encoder.encode(JSON.stringify(artifact.diagnostics, null, 2));
      for (const asset of artifact.assets) {
        if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(asset.filename) || asset.filename.includes('..') || Object.hasOwn(files, asset.filename)) throw new Error('Invalid asset name');
        files[asset.filename] = asset.bytes;
      }
      this.download(zipSync(files, {level: 6}), 'application/zip', artifact.filename.replace(/\.pdf$/i, '') + '-html.zip');
    } catch { if (generation === this.generation) this.status(this.t.loadError, false, true); } finally { button.disabled = false; }
  }
}

for (const root of document.querySelectorAll('[data-demo-root]')) new DemoApplication(root).start();
