# PDFToolkit — PDF to HTML demo

[English](README.md) · [Français](README.fr.md)

[Open the demo](https://pdftoolkit.github.io/modules/to-html/demo/) to compare real
PDFs with their semantic HTML, interact with the results, and convert your own
tagged PDF without sending it to a server.

## Try it

1. Choose an example. The page takes you to its PDF and HTML result. **See the
   result** also takes you there; **Back to examples** returns to the gallery.
2. Compare the original PDF with the web page, then try **HTML result**, **HTML
   code** or **Diagnostics**. A diagnostic explains content the converter could
   not preserve or had to adapt.
3. Use **Download source PDF** on any example card, or **Download PDF** above its
   result. **Download HTML + assets** saves the exact HTML with its supporting
   files in a ZIP.

**Original source** is selected by default and keeps the original layout.
Choose **Readable view** to add colours and visual indentation without adding or
removing any source characters.
**Copy HTML** and downloads preserve the exact converter output, including
MathML whitespace. Visual formatting is limited to 1 MiB and 20,000 tokens;
larger results remain available as original source and downloads.

The [example guide](docs/examples.md) describes each case. A **tagged PDF**
contains an explicit reading order and information about headings, lists and
other content. Start with a gallery PDF if you do not have one.

Choose or drop a tagged PDF to convert it on the fly in your browser. Gallery
results are prepared in advance; your imported PDF is converted when you select
it. The engine is downloaded only on demand. Files remain in the page and Worker memory: there is no upload
endpoint, analytics, service worker, persistent browser storage or credential
collection. Clear the file or close the page to release the application’s copy.
Cancellation terminates the Worker. Ordinary browser caching may retain the
public application/runtime files, but never the PDF selected through the file
input or its generated output.

The browser profile accepts up to 8 MiB and 100 pages, with a 30-second deadline,
128 MiB PHP memory limit, cumulative parser limits and bounded output/assets.
Malformed, encrypted, untagged and unsupported PDFs receive explicit messages.
It does not infer document structure, perform OCR or reproduce page layout.

JPEG, JPEG 2000 and JBIG2 image streams can be decoded by the bundled PHP
codecs in both native execution and WebAssembly. `ReaderFactory` explicitly
selects the PHP backend; importing a PDF never starts a native process or asks a
server to decode it. Image decoding is limited to 1,048,576 pixels, 4,096 pixels
per dimension, four components, 20 million work units and a 64 MiB accounted
codec memory budget, within the Worker's overall limits. The HTML consumer still
requires a representable colour space, depth and sampling grid; unsupported
image semantics remain explicit diagnostics. This does not add page rendering.

The application explicitly enables filtered local CSS and the documented LaTeX
catalogue Supplement merging profile from HTML 0.8.0. These options preserve
styles independently of script permission; the converter still filters resource
functions and unsupported CSS. PDF scripts and remote resources are disabled.
Results appear in an isolated
iframe; preview links cannot fetch remote destinations. The curated reset example
alone enables the library-owned form runtime, without PDF ECMAScript. Its iframe
has no same-origin, form submission, popup or top-navigation permission. The
download contains the converter’s original output rather than the preview’s
additional isolation layer. An expansion budget also bounds embedded preview
assets; oversized previews retain access to the exact HTML and ZIP downloads.

Graphics rendering and signature verification in selected gallery examples are
explicit **build-time application capabilities**. Importing those PDFs with the
default browser profile can produce a different result, explained by diagnostics.
The signature example uses a public test certificate, checks integrity and does
not establish PKI trust or permission for later changes.

## Build and run

The application uses the unmodified, released
[`pdftoolkit/pdf-to-html` 0.8.0](https://github.com/PDFToolkit/pdf-to-html/releases/tag/v0.8.0)
with its locked Reader and core dependencies. A fresh PHP 8.3 WebAssembly Worker
per conversion runs the same PHP objects used by a native application. The
runtime must report 64-bit integers and DOM, mbstring, zlib and ZIP support.
No JavaScript reimplementation of PDF derivation is involved.

Requirements: 64-bit PHP 8.3+ with DOM, mbstring, zlib and OpenSSL; Composer;
Node 24.18+ and npm 11.16+; Python 3.13; Poppler `pdftoppm`. The build also
requires the Chromium version pinned by Playwright 1.62.1 to capture the actual
HTML previews. Install its browser before building. Use the original released
HTML checkout to obtain the signature fixture and verify its provenance:

```sh
composer install --no-dev
npm ci --ignore-scripts
node node_modules/playwright/cli.js install --with-deps chromium firefox
mkdir -p _build
git clone --branch v0.8.0 --depth 1 https://github.com/PDFToolkit/pdf-to-html.git _build/html-source
python3 tools/build_demo.py --output dist --html-source _build/html-source --draft
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. The French interface is at `/fr/`. HTTPS or localhost
is required for the browser’s integrity and Worker APIs. Serve `.wasm` with its
standard MIME type; the application loads compressed runtime bytes explicitly,
so it does not depend on a host’s compression headers. No special cross-origin
isolation headers or backend are required. Use a new or empty build directory.

A release build replaces `--draft` with `--revision` and the exact clean Git
commit. `demo-manifest.json` inventories the supporting application, gallery and runtime
assets with their sizes and SHA-256 hashes; its own JSON and the English/French
launcher HTML pages are outside that inventory. `gallery/gallery-manifest.json` separately records the
PDFs, code, previews, exact HTML, diagnostics, capabilities and package provenance.
`assets/runtime-manifest.json` records the Composer/npm versions and runtime.
Draft output cannot be used as a published documentation source.

The build captures eleven HTML previews through the real application, using
`?sample=<id>` and its isolated result iframe. It waits for fonts and images,
then captures the iframe body without changing the derived document. Poppler
renders the original PDF previews separately. Each `files.htmlPreview` entry
records PNG size, dimensions and SHA-256; `gallery.browserPreview` records the
actual Chromium/Playwright versions and capture viewport. These screenshots show
the application's additional preview isolation, while `result.html.txt` remains
the exact converter output. No raw converted HTML page is exposed for navigation.

The documentation site pins this application’s published tag and peeled commit
independently of the library versions. Its native English/French demo pages copy
the verified static assets; they do not run PHP on the server.

## Verify

```sh
php tests/conversion.php
php tests/image-conversion.php
python3 -m venv _build/validation-venv
_build/validation-venv/bin/python -m pip install --require-hashes -r tools/validation-requirements.txt
_build/validation-venv/bin/python tools/validate_demo.py dist --report _build/validation.json
node tests/browser.cjs --base-url http://localhost:8080/ --output _build/browser
```

Keep the local server running for the browser command. Add `--require-release`
to `validate_demo.py` for a release candidate; it rejects draft provenance. The
independent oracle uses pypdf, HTML5lib, Pillow and a fresh Poppler rendering to
check real structure, table/MathML/form/signature mappings, complete asset hashes
and both PDF and HTML previews. It does not infer universal conversion, pixel
identity across system fonts, accessibility certification or certificate trust.

The browser checks exercise the real WebAssembly engine, compare returned bytes
with native conversion, inspect the gallery, forms, MathML and signatures, test
failure/cancellation/privacy boundaries, and retain screenshots in both engines.
The widget regression places its parent iframe outside a short viewport, scrolls
it into view before interacting with its content, then checks three distinct
normal, hover and pressed appearances. The report retains viewport geometry and
appearance hashes for both standalone and documentation hosting.
CI builds from the exact candidate and retains the generated artifact and reports.
Native bridge checks run on PHP 8.3, 8.4 and 8.5.

Application code is MIT licensed. The bundled PHP.wasm runtime and other
dependencies retain their own licences, included under
`assets/runtime/licenses/` and in the application archive. Their pinned source
references are recorded alongside those notices.
