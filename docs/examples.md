# Real PDF examples

[English](examples.md) · [Français](examples.fr.md)

The gallery is built from real PDF bytes and converted with the released
`pdftoolkit/pdf-to-html` **0.8.1**, revision
`b60a1816de2a340fdf9ddd01c4ac70d4f40f5d2f`. Its HTML is the exact converter output.
The application does not write replacement HTML to imitate a conversion.

`src/Gallery/CaseFactory.php` creates six PDFs using explicit core objects:
content operators, fonts and metrics, a logical structure tree, parent-tree
associations, attributes, associated files and AcroForm widgets. `PdfScene`
serializes these objects. The header artwork is explicitly marked `Artifact`.
An unchanged, published signature test fixture and three image PDFs authored by
`ImageCaseFactory`, plus an unchanged LuaLaTeX MathML structure fixture, bring
the gallery to eleven cases.

| Case ID | What to inspect | Conversion profile |
| --- | --- | --- |
| `structure` | Reading order, headings, selectable paragraphs, reflow; the decorative banner is absent from HTML. | `basic` |
| `table-listes` | A caption, explicit column headers and `Headers` relationships, then a real numbered list. | `basic` |
| `mathml` | A formula painted in the PDF and its associated MathML supplement; the browser lays out its exponent and fraction. | `basic` |
| `mathml-se` | An actual LuaLaTeX document with MathML structure elements: inline and displayed fractions/exponents, then a two-by-two matrix. | `basic` |
| `formulaire-reset` | Change Name and Language, then reset: Name becomes its PDF default Ada Lovelace; Language is outside the reset selection. | `reset` |
| `apparences` | A native button with the PDF's normal, rollover and down appearances. | `rendering` |
| `graphique` | A figure's bars, text and values are rendered together; neighbouring prose remains selectable HTML. | `rendering` |
| `jpeg` | An original JPEG with an explicit PDF Decode inversion, actually decoded into PNG by PHP. | `basic` |
| `jpeg2000` | The original RGB illustration, encoded losslessly as JP2 and decoded into PNG by PHP. | `basic` |
| `jbig2` | A lossless monochrome illustration in a genuine JBIG2 generic MMR region. | `basic` |
| `signature` | Open the native status popover by mouse or keyboard. The original PDF is checked against an explicitly chosen public test certificate. | `signature` |

The explanatory interface is bilingual. The six core-authored PDF samples use English
ASCII text and Helvetica with explicit font metrics; the LaTeX fixture embeds
Latin Modern fonts and mathematical Unicode. Together, they do not demonstrate all
writing systems, fonts or accessibility requirements. Table structure and
alternative text are demonstrators, not an accessibility certification.

## Capabilities are explicit

`basic` explicitly enables filtered local stylesheets
(`allowEmbeddedStylesheets`) and LaTeX catalogue supplement merging
(`mergeCatalogHtmlSupplements`), with strict validation of the source structure
for the gallery build. The other gallery profiles use the same stylesheet
options. PDF scripts and remote resources remain disabled. The merge option is
a documented interoperability choice for LaTeX documents containing separate
list and alignment stylesheets. The basic PDFs, including all three image cases,
are compared between native PHP and the browser's WebAssembly conversion.

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

Browser imports use the same local stylesheet options in a separate safe profile. They do not gain reset execution,
a raster engine or a signature verifier merely because the gallery demonstrates
those explicitly enabled capabilities. A PDF imported from a gallery card can
therefore differ from that card's preconverted result when its profile is not
`basic`.

## Two ways to carry MathML

The `mathml` example associates XML MathML with its PDF `Formula` using
`AFRelationship=Supplement`. That MathML already exists inside the PDF; the
converter includes it in HTML for the browser to display.

The `mathml-se` example is an original document compiled by LuaLaTeX from TeX
Live 2026 with `math/setup=mathml-SE`. Its mathematical tags are directly in the
PDF structure tree, with no MathML associated XML file. The original PDF, actual
TeX source and compiler/package provenance are downloadable. The converter's
retained `mathml-se-af.pdf` test also contains both methods: its original
structure IDs prove that SE wins over AF, without rendering a formula twice.

The separate repository generator runs two passes in each of two clean
directories and checks byte identity, with a fixed date, random seed and PDF
identifiers. Building this demo uses retained files and needs no TeX installation.
These small fixtures cover inline/display exponents and fractions, and a two-by-two
matrix. They do not establish universal LaTeX or assistive-technology support.

## Image inputs and pixel evidence

`tools/generate_image_examples.py` creates an original 320 × 160 illustration
and encodes it with Pillow, libjpeg, OpenJPEG and libtiff. Versions, input hashes
and reference PNGs are retained under `resources/images/`; no third-party photo
or normative test picture is used. The gallery embeds the exact compressed
bytes in native PDF image objects. These tools run only when regenerating the
retained inputs, never in the browser or during ordinary gallery builds.

The JPEG 2000 witness uses a 160 × 80 Lanczos reduction of that artwork before
lossless encoding; JPEG and JBIG2 remain 320 × 160. Its separate source PNG and
declared native dimensions are retained and compared exactly. This keeps the
interactive example practical in a fresh Firefox WebAssembly Worker on slower
CPUs without increasing the application's 30-second deadline. Runtime speed
depends on the browser and device; even an input below the pixel limit can
exhaust the time budget. The full codec validation corpus remains independent
of these small teaching examples.

The JPEG input stores inverted colours and the PDF supplies `/Decode [1 0 1 0
1 0]`. This forces actual PHP decoding instead of the converter's compatible
JPEG passthrough. Its reference is independently decoded by libjpeg and inverted
according to that PDF mapping. The observed allowed difference for this example
is at most three levels per eight-bit channel; JPEG is not lossless. JP2 and
JBIG2 are compared exactly to the original pixels. This tolerance is specific to
this fixture, not a universal codec guarantee.

Every image case publishes `encoded-image.bin`, `reference-image.png` and
`image-provenance.json`, with complete inventory hashes. `validate_demo.py`
checks the embedded PDF stream, image dimensions, Decode mapping and pixel
comparison independently with pypdf and Pillow. Chromium and Firefox then import
the real PDFs through fresh WebAssembly Workers and compare exact HTML and
PNG assets to native conversion. PNG captures show the real isolated preview.
Browser reports retain each import's duration and terminal status. A failure
also retains the visible message and a screenshot, including deadline errors.

## Rebuild

Install the exact Composer lock and provide PHP 8.3 or later with DOM, mbstring,
zlib and OpenSSL, plus a local `pdftoppm`. No Docker or backend is required by the
published application. A reproducible build environment should pin PHP,
Poppler and system fonts; the manifest records the actual Poppler version.

```sh
composer install --no-dev --prefer-dist --no-interaction
php bin/build-gallery.php --output dist/gallery \
  --html-source ../pdf-to-html --revision "$(git rev-parse HEAD)" --version 0.3.0
```

`--html-source` identifies the released HTML source checkout containing
`tests/Fixtures/signatures/`. The builder verifies the exact retained SHA-256
hashes of the PDF and certificate. It also reads the retained
`tests/Fixtures/mathml-latex/` PDF, TeX source and compiler provenance. The final
gallery requires all eleven cases.
A final build also requires the exact clean Git HEAD of this demo repository;
`--revision` can be omitted to read it directly. An optional `--pdftoppm` selects
an explicit local executable.

Before the first commit, use `--draft` instead of `--revision`. Draft manifests
have `draft: true` and `generator.commit: null`; they are review artifacts and
must not be published. Without `--html-source`, a draft contains the nine
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
- `LatexMathMlFixture`, `LatexMathMlFixtures`: verified LaTeX PDF, source and provenance.
- `ImageFixture`, `ImageFixtures`, `ImageCaseFactory`: verified encoded inputs and tagged image pages.
- `ReaderFactory`: bounded, explicit PHP image decoding shared by gallery and imports.
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
- `<id>/example.php.txt`: exact source factory, served as `text/plain`. The
  LaTeX case supplies its actual `example.tex.txt` and `latex-provenance.json`.
- `<id>/diagnostics.json`: unfiltered converter diagnostics and input/output hashes.
- Converter assets beside the HTML; the signature case also includes `signer.der`.

Each file entry has `path`, `bytes`, `sha256` and `mediaType`. The root `assets`
array inventories every delivered file except the manifest itself, including
supporting source code. `source.kind` is either `generated` (this demo commit) or
`published-fixture` (the exact HTML 0.8.1 fixture path). No loose `.html` document
is generated by this builder. The surrounding application separately verifies
and isolates previews; a filename or hash alone is not permission to execute a
script.

Build-time assertions check the expected semantic elements, passive/script
profiles and signature status. Releasing additionally requires the repository's
native/WebAssembly comparison and Chromium/Firefox interaction checks. The
manifest is evidence of bytes and provenance, not a claim of universal PDF
conversion or visual equivalence.
