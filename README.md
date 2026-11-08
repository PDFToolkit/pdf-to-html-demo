# PDFToolkit — PDF to HTML demo

[English](README.md) · [Français](README.fr.md)

[Open the demo](https://pdftoolkit.github.io/modules/to-html/demo/) to compare real
PDFs with their semantic HTML, interact with the results, and convert your own
tagged PDF without sending it to a server.

Version 0.4.2 uses Reader 0.8.1, HTML 0.8.3 and the canonical core
`pdftoolkit/pdf:0.12.3`. The runtime bundles their exact published revisions;
PHP namespaces and conversion behavior are unchanged.

## Try it

1. Choose an example. The page takes you to its PDF and HTML result. **See the
   result** also takes you there; **Back to examples** returns to the gallery.
2. Compare the original PDF with the web page, then try **HTML result**, **HTML
   code**, **PDF structure** or **Diagnostics**. A diagnostic explains content the converter could
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
Malformed, encrypted and unsupported PDFs receive explicit messages. Readable untagged PDFs can be inspected even though HTML derivation is unavailable.
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
catalogue Supplement merging profile from HTML 0.8.3. These options preserve
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

## When an import cannot start

The gallery uses prepared results and does not need the WebAssembly engine.
Converting a selected PDF additionally requires a secure context (HTTPS or
localhost), Workers, WebAssembly, Web Crypto and `DecompressionStream`. The
application checks these capabilities, including instantiating a small
WebAssembly module, before loading the conversion engine.

When JavaScript Promise Integration (JSPI) is available, the application tests
an actual suspension and resumption through both `WebAssembly.Suspending` and
`WebAssembly.promising`. It selects the JSPI runtime only if that test succeeds;
otherwise it uses the bundled Asyncify runtime. Asyncify still requires
WebAssembly. If WebAssembly itself cannot run, the application stops with an
explicit message rather than trying a runtime that cannot work. These checks do
not identify which browser setting or extension caused a restriction.

Startup messages distinguish missing capabilities, runtime downloads, integrity
checks, initialization and a startup deadline from failures while converting a
PDF. A startup failure offers a local report that you can select and copy into a
bug report. It contains only `schemaVersion`, `applicationVersion`, a stable
error `code`, `stage`, `runtimeVariant` and boolean capability results
(`secureContext`, `worker`, `webAssembly`, `crypto`, `decompressionStream`). It
contains no PDF name, hash or content, raw exception message or stack trace.
Nothing is sent automatically; sharing the report is your choice. The report
schema version is 1.

These checks cover unsupported or restricted runtime configurations. The
reported Firefox 157 environment on Arch Linux with NoScript has not been
reproduced, so this release does not establish that its original failure is
resolved. The local report helps distinguish that failure without requiring the
PDF itself.

## Inspect the PDF source

Choose **PDF structure** to explore the original tag tree, MCID/MCR/OBJR content
references, parsed properties, page/object identities including generations,
namespaces, role mappings and associated-file metadata. The left pane selects
nodes or document sections; the right pane shows typed values. Object references
navigate within the snapshot. **Download inspection JSON** saves the exact
snapshot with the original PDF's SHA-256 and byte length.

This uses Reader 0.8's independent `DocumentInspector`, before HTML derivation.
It shows parsed PDF values before HTML/MathML replacement, not a reconstruction
of the HTML tree. Original whitespace and lexical spelling are not preserved by
the parser. Names/strings include hexadecimal source bytes; integers are strings
to preserve precision. Stream bodies and embedded files are never decoded or
extracted by inspection. PDF links, filenames and strings are inert text.

Inspection is read-only. Editing and PDF re-export are separate work. An
inspection already received stays available, together with the source PDF, if
subsequent HTML derivation fails, is cancelled or times out. A new file or Clear
replaces/releases that result. Encrypted inputs still need explicit Reader
credentials in a native application; this browser demo collects none.

The snapshot is limited to 5,000 tree nodes, 100 pages, 2,000 referenced objects,
20,000 values, depth 48, 2 MiB of accounted representation data, 4,096 source bytes
per string, 1,000 file associations and 100 diagnostics. Limit indicators describe
partial results; the final JSON transport is capped at 8 MiB. Tree branches and
long property lists are displayed progressively. Gallery snapshots use the same
PHP API, are inventoried with hashes and need no browser runtime download.

## Build and run

The application uses the unmodified, released
[`pdftoolkit/pdf-to-html` 0.8.3](https://github.com/PDFToolkit/pdf-to-html/releases/tag/v0.8.3)
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
git clone --branch v0.8.3 --depth 1 https://github.com/PDFToolkit/pdf-to-html.git _build/html-source
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
php tests/inspection.php
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
Startup regressions cover working and unavailable JSPI, the Asyncify fallback,
blocked WebAssembly, sanitized reports in both interface languages, cancellation
and startup deadlines separately from conversion deadlines. The reports record
the actual browser versions; they do not stand in for testing the reported
Firefox 157 configuration.
CI builds from the exact candidate and retains the generated artifact and reports.
Native bridge checks run on PHP 8.3, 8.4 and 8.5.

Application code is MIT licensed. The bundled PHP.wasm runtime and other
dependencies retain their own licences, included under
`assets/runtime/licenses/` and in the application archive. Their pinned source
references are recorded alongside those notices.
