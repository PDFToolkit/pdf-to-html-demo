"""Build the standalone application and its reproducible documentation assets."""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import mimetypes
from pathlib import Path
import shutil
import subprocess


class DemoBuild:
    def __init__(self, args):
        self.args = args
        self.root = Path(__file__).resolve().parents[1]
        self.output = args.output.resolve()

    def run(self):
        if self.output == self.root or self.root.is_relative_to(self.output):
            raise ValueError('Choose a dedicated output directory.')
        if self.output.exists() and any(self.output.iterdir()):
            raise ValueError('The output directory must be new or empty.')
        if not self.args.draft:
            head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=self.root, text=True).strip()
            if head != self.args.revision:
                raise ValueError('The build revision must identify this exact checkout.')
            if subprocess.check_output(['git', 'status', '--porcelain'], cwd=self.root, text=True).strip():
                raise ValueError('A release build requires a clean checkout.')
        self.output.mkdir(parents=True, exist_ok=True)
        for name in ('app.js', 'app.css'):
            shutil.copyfile(self.root / 'public' / name, self.output / name)
        self.command([self.args.node, 'tools/build_runtime.mjs', '--output', self.output])
        self.command([self.args.php, 'bin/build-gallery.php', '--output', self.output / 'gallery',
                      '--html-source', self.args.html_source.resolve(), '--pdftoppm', self.args.pdftoppm,
                      *(['--draft'] if self.args.draft else ['--revision', self.args.revision])])
        gallery = json.loads((self.output / 'gallery/gallery-manifest.json').read_text())
        self.script_hashes = sorted({'sha256-' + base64.b64encode(bytes.fromhex(asset['sha256'])).decode('ascii')
                                    for case in gallery['cases'] if case['profile'] == 'reset'
                                    for asset in case['files']['assets'] if asset['mediaType'] == 'text/javascript'})
        for language in ('en', 'fr'):
            path = self.output / ('index.html' if language == 'en' else 'fr/index.html')
            path.parent.mkdir(exist_ok=True)
            path.write_text(self.page(language), encoding='utf-8')
        self.command([self.args.node, 'tools/render_gallery.mjs', '--output', self.output])
        gallery = json.loads((self.output / 'gallery/gallery-manifest.json').read_text())
        manifest = {
            'schemaVersion': 1,
            'application': {'repository': 'https://github.com/PDFToolkit/pdf-to-html-demo',
                            'version': '0.3.0', 'revision': self.args.revision, 'draft': self.args.draft},
            'htmlPackage': gallery['htmlPackage'],
            'gallery': 'gallery/gallery-manifest.json',
            'runtime': 'assets/runtime-manifest.json',
            'worker': 'assets/conversion-worker.js',
            'trustedScriptHashes': self.script_hashes,
            'assets': [],
        }
        for path in sorted(self.output.rglob('*')):
            if path.is_symlink():
                raise ValueError('Published assets must be ordinary files.')
            if not path.is_file():
                continue
            if path.relative_to(self.output).as_posix() in ('index.html', 'fr/index.html'):
                continue
            if path.suffix == '.html':
                raise ValueError('Derived HTML must be published as plain text for sandboxed previews.')
            data = path.read_bytes()
            if len(data) > 96 * 1024 * 1024:
                raise ValueError('An individual demo asset exceeds its publication budget.')
            manifest['assets'].append({'path': path.relative_to(self.output).as_posix(),
                                       'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                                       'mediaType': self.media_type(path)})
        (self.output / 'demo-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
        print(json.dumps({'output': str(self.output), 'version': '0.3.0', 'revision': self.args.revision,
                          'draft': self.args.draft, 'cases': len(gallery['cases']),
                          'assets': len(manifest['assets']), 'bytes': sum(item['bytes'] for item in manifest['assets'])}))

    def command(self, arguments):
        subprocess.run([str(value) for value in arguments], cwd=self.root, check=True)

    @staticmethod
    def media_type(path):
        return {'.wasm': 'application/wasm', '.js': 'text/javascript', '.json': 'application/json',
                '.txt': 'text/plain', '.pdf': 'application/pdf'}.get(path.suffix,
                    mimetypes.guess_type(path.name)[0] or 'application/octet-stream')

    def page(self, language):
        french = language == 'fr'
        base = '../' if french else './'
        title = 'Démo PDF vers HTML' if french else 'PDF to HTML demo'
        doc = 'https://pdftoolkit.github.io/' + ('fr/' if french else '') + 'modules/to-html/'
        fragment = (self.root / f'public/fragment.{language}.html').read_text()
        fragment = fragment.replace('{{ASSET_ROOT}}', base).replace('{{LANGUAGE}}', language)
        scripts = ' '.join("'" + value + "'" for value in self.script_hashes)
        csp = f"default-src 'none'; script-src 'self' blob: 'wasm-unsafe-eval' {scripts}; worker-src 'self'; connect-src 'self'; style-src 'self' data: blob: 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'"
        language_link = '../' if french else 'fr/'
        return f'''<!doctype html>
<html lang="{language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{html.escape(csp, quote=True)}">
<meta name="referrer" content="no-referrer"><title>{title} · PDFToolkit</title>
<link rel="stylesheet" href="{base}app.css"><script type="module" src="{base}app.js"></script></head>
<body class="demo-shell"><header><a href="{doc}"><strong>◈ PDFToolkit</strong></a>
<nav aria-label="{'Navigation' if french else 'Navigation'}"><a href="{doc}">Documentation</a><a href="https://github.com/PDFToolkit/pdf-to-html-demo">GitHub</a><a href="{language_link}" lang="{'en' if french else 'fr'}">{'English' if french else 'Français'}</a></nav></header>
<main><h1>{title}</h1>{fragment}</main>
<footer>PDFToolkit demo 0.3.0 · <a href="{base}demo-manifest.json">{'Versions et provenance' if french else 'Versions and provenance'}</a> · <a href="{base}assets/runtime/licenses/SOURCES.txt">{'Sources du moteur' if french else 'Runtime sources'}</a></footer></body></html>'''


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--html-source', type=Path, required=True)
    parser.add_argument('--php', default='php')
    parser.add_argument('--node', default='node')
    parser.add_argument('--pdftoppm', default='pdftoppm')
    provenance = parser.add_mutually_exclusive_group(required=True)
    provenance.add_argument('--revision')
    provenance.add_argument('--draft', action='store_true')
    DemoBuild(parser.parse_args()).run()
