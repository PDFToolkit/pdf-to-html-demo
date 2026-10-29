# Changelog

[English](CHANGELOG.md) · [Français](CHANGELOG.fr.md)

## Unreleased

## 0.3.0 — 2026-10-29

- Pin the released HTML 0.8.1 package and exact source revision, with stable
  Reader/core/Codecs dependencies and matching native/WebAssembly provenance.
- Expand the bilingual gallery to eleven actual conversions with a reproducible
  LuaLaTeX MathML SE document. Keep its original PDF, TeX source and compiler
  provenance together; retain the separate associated MathML example and explain
  the two source representations without calling existing MathML “real”.
- Enable filtered embedded stylesheets and the explicit LaTeX catalogue HTML
  Supplement interoperability profile independently of scripts and remote
  resources. Use the converter's bounded CSS and list-layout corrections.
- Bring the selected or imported result into view, add result/gallery navigation
  and expose source PDF downloads directly on example cards. Start FR/EN guides
  with the practical steps for trying an example or importing a tagged PDF.
- Keep original HTML source as the default. Offer an optional coloured, visually
  indented view without inserting or deleting source characters, including
  MathML whitespace. Copy and ZIP downloads retain the original bytes; bound
  visual formatting to 1 MiB and 20,000 tokens.
- Execute the verified WebAssembly loader bytes directly, preserve their module
  URL base and distinguish runtime download, initialization, integrity and
  conversion errors. Revalidate public runtime assets to avoid mixed cached
  deployments. Imports remain local, transient and cancellable.
- Extend Chromium/Firefox checks for the MathML SE gallery and actual browser
  import, exact source formatting/copying, result navigation, direct PDF downloads
  and startup failures. These regressions do not claim that the separately
  reported Firefox 157 environment was reproduced.

## 0.2.1 — 2026-10-29

- Scroll the containing preview iframe into view before the browser acceptance
  test interacts with its appearance widget. This avoids Chromium waiting on an
  off-screen child when the ten-example gallery is embedded in the documentation.
- Reproduce the off-screen parent with a short test viewport in Chromium and
  Firefox, verify that scrolling reveals it, then compare all three normal,
  hover and pressed appearances. Retain geometry and appearance hashes in the
  browser report. Application styles, conversion budgets and output are unchanged.

## 0.2.0 — 2026-10-29

- Use released HTML 0.7, Reader 0.7, core 0.12.1 and optional PHP Codecs 0.1,
  retaining all four exact source/distribution identities in the runtime manifest.
- Add JPEG, JPEG 2000 and JBIG2 examples to the bilingual gallery, including
  original PDF sources, derived PNG assets, component provenance and independent
  pixel comparisons. The gallery now contains ten real conversions.
- Decode supported images entirely in PHP in browser Workers, using the same
  explicit Reader configuration for gallery builds and imported PDFs. Preserve
  the source bytes and explicit diagnostics for profiles outside the bounded
  browser conversion policy.
- Bound codecs to four components, one million pixels, twenty million work units
  and 64 MiB codec memory within the existing 128 MiB Worker limit. Cancellation
  terminates the Worker; imports remain local and are never persisted.
- Verify all three image imports, HTML/asset ZIP bytes and native-PHP/WebAssembly
  output in Chromium and Firefox, alongside the existing privacy, hostile-input,
  cancellation, keyboard and mobile checks. Retain PDF.js/Apache attribution in
  both the runtime and downloadable archives.
- Keep the JPEG 2000 gallery witness at 160 × 80 pixels for slower WebAssembly
  runtimes, with an independent lossless reference and the unchanged 30-second
  Worker deadline. Retain import duration, failure messages and screenshots in
  browser evidence. Startup errors no longer assume an outdated browser.

## 0.1.0 — 2026-10-28

First release of the standalone PDFToolkit PDF-to-HTML demonstration.

- Convert user-selected tagged PDFs locally in a fresh PHP 8.3 WebAssembly Worker
  using the unmodified HTML 0.6.0 package and locked Reader/core dependencies.
  Conversion checks 64-bit integers and required extensions, bounds files,
  pages, memory, time and output, and supports cancellation by terminating the
  Worker. Selected PDFs and conversion results are not sent or persisted.
- Provide a bilingual gallery of seven actual PDF conversions: document
  structure, tables/lists, MathML, selective form reset, widget appearances,
  grouped graphics and signature status. Six source PDFs are generated through
  explicit core objects; the signature uses an unchanged published test fixture
  and public certificate.
- Show PDF and HTML side by side, offer HTML/diagnostic/source inspection, retain
  keyboard-accessible controls, and download the original PDF or exact HTML plus
  assets in a ZIP. Preview isolation remains separate from downloadable bytes.
- Keep source PDF scripts and remote resources disabled. Only the curated reset
  case activates library-owned form logic. Raster rendering and signature
  verification are explicit gallery build capabilities; ordinary browser imports
  do not activate them. Signature integrity does not imply PKI trust, revocation
  validation or permission for later changes, and the derived HTML is not signed.
- Build source-page PNGs with Poppler and capture actual HTML iframe bodies with
  pinned Chromium/Playwright. Record package revisions, engine versions, complete
  asset inventories, byte sizes and SHA-256 hashes. Publish derived HTML and PHP
  source as plain-text downloads. Draft provenance cannot be used for a release.
- Include English/French reproduction guides, independently pinned PDF/HTML/PNG
  oracles, native PHP checks for 8.3/8.4/8.5 and Chromium/Firefox acceptance tests.
  The checks retain provenance and screenshots without claiming universal PDF
  support, visual equivalence, complete accessibility or certificate trust.
- Package the application as static files for standalone hosting and verified
  embedding in the documentation site. No deployment backend or Docker runtime
  is required; bundled dependencies retain their licences and source references.
