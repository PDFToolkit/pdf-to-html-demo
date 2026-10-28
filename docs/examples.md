# Real PDF examples

The gallery is built from real PDF bytes and converted with the released
`pdftoolkit/pdf-to-html` **0.6.0**, revision
`ca0e6da0c28cd79933c9006bbf4b9d942d933e78`. Its HTML is the exact converter output.
The application does not write replacement HTML to imitate a conversion.

`src/Gallery/CaseFactory.php` creates six PDFs using explicit core objects:
content operators, fonts and metrics, a logical structure tree, parent-tree
associations, attributes, associated files and AcroForm widgets. `PdfScene`
serializes these objects. The header artwork is explicitly marked `Artifact`.
The seventh PDF is an unchanged, published signature test fixture.

| Case ID | What to inspect | Conversion profile |
| --- | --- | --- |
| `structure` | Reading order, headings, selectable paragraphs, reflow; the decorative banner is absent from HTML. | `basic` |
| `table-listes` | A caption, explicit column headers and `Headers` relationships, then a real numbered list. | `basic` |
| `mathml` | A formula painted in the PDF and an embedded MathML alternative; the browser lays out its exponent and fraction. | `basic` |
| `formulaire-reset` | Change Name and Language, then reset: Name becomes its PDF default Ada Lovelace; Language is outside the reset selection. | `reset` |
| `apparences` | A native button with the PDF's normal, rollover and down appearances. | `rendering` |
| `graphique` | A figure's bars, text and values are rendered together; neighbouring prose remains selectable HTML. | `rendering` |
| `signature` | Open the native status popover by mouse or keyboard. The original PDF is checked against an explicitly chosen public test certificate. | `signature` |

The explanatory interface is bilingual. These authored PDF samples use English
ASCII text and Helvetica with explicit font metrics; they do not demonstrate all
writing systems, fonts or accessibility requirements. Table structure and
alternative text are demonstrators, not an accessibility certification.

## Capabilities are explicit

`basic` uses the library's safe default derivation policy, with strict validation
of the source structure for the gallery build. It does not enable source PDF
ECMAScript or remote resources. These three PDFs are also the main comparison
corpus for native PHP and the browser's WebAssembly conversion.

`reset` adds only `FormActionPolicy(allowReset: true)`. The converter emits a
library-owned `pdf-script-<sha256>.js` asset with media type `text/javascript`.
The gallery manifest records its exact bytes and hash. This script implements
PDF default values and field selection; no PDF JavaScript or submission is
allowed. A source button appearance is intentionally not rasterized in this
profile, and the converter reports that choice in its diagnostics.

`rendering` explicitly supplies `RasterContentRenderer` and the build-time
`PopplerRasterizer`. It also selects `preferVisualFigures`. Poppler receives an
isolated PDF from the converter to paint a figure or appearance. The source PDF
page preview is rendered separately by the same pinned build environment. The
static application contains the resulting image bytes; it does not run Poppler
or require a server for an upload.

`signature` explicitly supplies `SignatureOutputValidation`, the core
`OpenSslSignatureOutputVerifier` and the fixture's public certificate.
`integrity-verified` means that the signed revision's bytes verify against this
chosen certificate. It does not establish PKI trust, current certificate
validity, revocation status, authorization for later changes or authenticity of
the derived HTML. The certificate is intentionally self-signed and expired. The
gallery copies only `signed-padded.pdf` and `signer.der` from the released fixture;
it does not read or include a signing key. The status popover needs no JavaScript.

Browser imports use a separate safe profile. They do not gain reset execution,
a raster engine or a signature verifier merely because the gallery demonstrates
those explicitly enabled capabilities. A PDF imported from a gallery card can
therefore differ from that card's preconverted result when its profile is not
`basic`.

## Rebuild

Install the exact Composer lock and provide PHP 8.3 or later with DOM, mbstring,
zlib and OpenSSL, plus a local `pdftoppm`. No Docker or backend is required by the
published application. A reproducible build environment should pin PHP,
Poppler and system fonts; the manifest records the actual Poppler version.

```sh
composer install --no-dev --prefer-dist --no-interaction
php bin/build-gallery.php --output dist/gallery \
  --html-source ../pdf-to-html --revision "$(git rev-parse HEAD)" --version 0.1.0
```

`--html-source` identifies the released HTML source checkout containing
`tests/Fixtures/signatures/`. The builder verifies the exact retained SHA-256
hashes of the PDF and certificate. The final gallery requires all seven cases.
A final build also requires the exact clean Git HEAD of this demo repository;
`--revision` can be omitted to read it directly. An optional `--pdftoppm` selects
an explicit local executable.

Before the first commit, use `--draft` instead of `--revision`. Draft manifests
have `draft: true` and `generator.commit: null`; they are review artifacts and
must not be published. Without `--html-source`, a draft contains only the six
authored PDFs. Rebuilding an existing gallery only replaces files whose hashes
still match its previous manifest; unknown or modified files cause a refusal.

The independent inspection command works on a complete application build:

```sh
python -m pip install --require-hashes -r tools/validation-requirements.txt
python tools/validate_demo.py dist --report _build/validation.json --require-release
```

It uses pypdf for real PDF objects, HTML5lib for parse recovery and semantic
relationships, and Pillow plus a fresh Poppler rendering for PNG bounds and
nonblank source pages. Omit `--require-release` for a draft review; the report
then records `publicationEligible: false`. Browser interactions and
native/WebAssembly equality are separate checks, not inferred by this oracle.

The process is separated into objects:

- `PdfNode`, `PdfScene`, `CaseFactory`: authoring and sample descriptions.
- `GalleryConversion`: explicit policies and released converter calls.
- `PopplerRasterizer`, `ProcessRunner`: bounded local rendering capability.
- `GalleryBuilder`: files, provenance, hashes and complete manifest publication.

`example.php.txt` is the exact factory source, not a standalone script. Its
supporting objects and the CLI are included under `source/` in the gallery. The
repository and its Composer lock provide the runnable context.

## Manifest and downloadable evidence

`dist/gallery/gallery-manifest.json` uses schema version 1. Its paths are relative
to that directory. `generator` identifies this demo's package, version and exact
commit. `htmlPackage` identifies the conversion package version and revision.
Each case contains bilingual `title`, `description` and `observations`, its
`profile`, `capabilities`, source provenance, `expected` features and these files:

- `<id>/source.pdf`: original bytes.
- `<id>/result.html.txt`: exact derived HTML, served as `text/plain`.
- `<id>/page-1.png`: source PDF preview, with actual dimensions in `pages`.
- `<id>/example.php.txt`: exact source factory, served as `text/plain`.
- `<id>/diagnostics.json`: unfiltered converter diagnostics and input/output hashes.
- Converter assets beside the HTML; the signature case also includes `signer.der`.

Each file entry has `path`, `bytes`, `sha256` and `mediaType`. The root `assets`
array inventories every delivered file except the manifest itself, including
supporting source code. `source.kind` is either `generated` (this demo commit) or
`published-fixture` (the exact HTML 0.6.0 fixture path). No loose `.html` document
is generated by this builder. The surrounding application separately verifies
and isolates previews; a filename or hash alone is not permission to execute a
script.

Build-time assertions check the expected semantic elements, passive/script
profiles and signature status. Releasing additionally requires the repository's
native/WebAssembly comparison and Chromium/Firefox interaction checks. The
manifest is evidence of bytes and provenance, not a claim of universal PDF
conversion or visual equivalence.
