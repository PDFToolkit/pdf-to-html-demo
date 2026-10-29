#!/usr/bin/env python3
"""Independently inspect the built demo, genuine PDFs, semantic HTML and provenance."""
from __future__ import annotations

import argparse
import base64
from collections import Counter
import hashlib
import importlib.metadata
import io
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

import html5lib
from PIL import Image, ImageStat, ImageChops
from pypdf import PdfReader


class DemoValidation:
    HTML_REVISION = 'b60a1816de2a340fdf9ddd01c4ac70d4f40f5d2f'
    SIGNATURE_HASH = '8b55dfe5e157d024d88703c4cd761f0bb77dfd94178536d5f6f06ea09f1bd10e'
    CERTIFICATE_HASH = '61ecaec8b4fc69746718148aedaec21ee853c583a8e5e05967dd494dc54ed1d6'
    CASES = {'structure', 'table-listes', 'mathml', 'mathml-se', 'formulaire-reset', 'apparences', 'graphique', 'signature', 'jpeg', 'jpeg2000', 'jbig2'}

    def __init__(self, args):
        self.args = args
        self.root = args.dist.resolve()
        self.report = {'status': 'running', 'tools': {name: importlib.metadata.version(name) for name in ('pypdf', 'html5lib', 'Pillow')}, 'checks': [], 'cases': []}

    def check(self, condition, name, detail=None):
        result = {'name': name, 'pass': bool(condition)}
        if detail is not None:
            result['detail'] = detail
        self.report['checks'].append(result)
        if not condition:
            raise AssertionError(name + (': ' + str(detail) if detail is not None else ''))

    @staticmethod
    def digest(data):
        return hashlib.sha256(data).hexdigest()

    def path(self, base, value):
        path = PurePosixPath(value)
        self.check(bool(value) and not path.is_absolute() and '..' not in path.parts and '\\' not in value and ':' not in value, 'safe relative asset path', value)
        result = base.joinpath(*path.parts)
        self.check(result.is_file() and not result.is_symlink() and result.resolve().is_relative_to(base.resolve()), 'ordinary contained asset', value)
        for parent in result.parents:
            if parent == base:
                break
            self.check(not parent.is_symlink(), 'asset parent is not a symlink', value)
        return result

    def inventory(self, base, entries, omitted):
        inventory = {}
        for item in entries:
            path = self.path(base, item['path'])
            self.check(item['path'] not in inventory, 'unique inventory path', item['path'])
            data = path.read_bytes()
            self.check(len(data) == item['bytes'] and self.digest(data) == item['sha256'], 'exact asset bytes and hash', item['path'])
            self.check(isinstance(item['mediaType'], str) and bool(item['mediaType']), 'declared asset media type', item['path'])
            inventory[item['path']] = item
        actual = set()
        for path in base.rglob('*'):
            self.check(not path.is_symlink(), 'no published symlink', str(path.relative_to(base)))
            if path.is_file():
                actual.add(path.relative_to(base).as_posix())
        self.check(actual == set(inventory) | omitted, 'inventory covers every published file', {'missing': sorted(actual-set(inventory)-omitted), 'unavailable': sorted(set(inventory)-actual)})
        return inventory

    def command(self, args):
        result = subprocess.run(args, capture_output=True, timeout=30, check=False)
        self.check(result.returncode == 0, 'independent tool completed', {'tool': args[0], 'stderr': result.stderr.decode(errors='replace')[:2000]})
        return result

    @staticmethod
    def local_name(element):
        return element.tag.rsplit('}', 1)[-1] if isinstance(element.tag, str) else ''

    def elements(self, document, name):
        return [node for node in document.iter() if self.local_name(node) == name]

    def source_structure(self, reader):
        root = reader.trailer['/Root']['/StructTreeRoot'].get_object()
        self.check('/ParentTree' in root, 'PDF has explicit parent-tree associations')
        elements = []
        def visit(value):
            if hasattr(value, 'get_object'):
                value = value.get_object()
            if isinstance(value, list):
                for child in value:
                    visit(child)
            elif isinstance(value, dict) and value.get('/Type') == '/StructElem':
                elements.append(value)
                visit(value.get('/K', []))
        visit(root['/K'])
        return elements

    @staticmethod
    def attributes(element, owner):
        raw = element.get('/A', [])
        if hasattr(raw, 'get_object'):
            raw = raw.get_object()
        if isinstance(raw, dict):
            raw = [raw]
        result = {}
        for attribute in raw:
            if hasattr(attribute, 'get_object'):
                attribute = attribute.get_object()
            if isinstance(attribute, dict) and attribute.get('/O') == owner:
                result.update(attribute)
        return result

    def html(self, case, text):
        parser = html5lib.HTMLParser(namespaceHTMLElements=True)
        doc = parser.parse(text)
        self.check(not parser.errors, case['id'] + ': HTML5 parse without recovery errors', parser.errors)
        ids = [node.attrib['id'] for node in doc.iter() if 'id' in node.attrib]
        self.check(len(ids) == len(set(ids)), case['id'] + ': unique HTML IDs')
        self.check(bool(self.elements(doc, 'title')) and bool(self.elements(doc, 'body')), case['id'] + ': complete HTML document')
        scripts = self.elements(doc, 'script')
        if case['profile'] != 'reset':
            self.check(not scripts, case['id'] + ': passive HTML contains no script')
        for tag in case['expected'].get('tags', []):
            self.check(bool(self.elements(doc, tag)), case['id'] + ': semantic ' + tag)
        for image in self.elements(doc, 'img'):
            source = image.attrib.get('src', '')
            self.check(source.startswith('data:image/png;base64,'), case['id'] + ': rendered image is embedded PNG')
            image_bytes = base64.b64decode(source.split(',', 1)[1], validate=True)
            with Image.open(io.BytesIO(image_bytes)) as parsed:
                parsed.verify()
            with Image.open(io.BytesIO(image_bytes)) as parsed:
                self.check(parsed.format == 'PNG' and min(parsed.size) > 0 and max(parsed.size) <= 1600, case['id'] + ': bounded decoded PNG')
        return doc

    def source_pages(self, case, reader, source, gallery):
        self.check(len(reader.pages) == len(case['pages']) == 1, case['id'] + ': one real PDF page')
        with tempfile.TemporaryDirectory(prefix='pdftoolkit-demo-validation-') as temporary:
            prefix = str(Path(temporary) / 'page')
            self.command([self.args.pdftoppm, '-f', '1', '-l', '1', '-singlefile', '-r', '96', '-scale-to', '1600', '-png', str(source), prefix])
            with Image.open(prefix + '.png') as independent:
                independent.load()
                independent_size = independent.size
                self.check(max(ImageStat.Stat(independent.convert('RGB')).var) > 10, case['id'] + ': independent page rendering is nonblank')
            preview = case['pages'][0]
            self.check(preview['mediaType'] == 'image/png', case['id'] + ': preview media type')
            with Image.open(self.path(gallery, preview['path'])) as supplied:
                supplied.load()
                self.check(supplied.format == 'PNG' and supplied.size == (preview['width'], preview['height']) == independent_size, case['id'] + ': source preview dimensions independently reproduced')
                self.check(max(ImageStat.Stat(supplied.convert('RGB')).var) > 10, case['id'] + ': supplied page rendering is nonblank')
        # Font substitutions differ across hosts; pixel identity is deliberately not inferred.

    def widgets(self, reader):
        fields = reader.get_fields() or {}
        canonical = reader.trailer['/Root'].get('/AcroForm', {}).get_object().get('/Fields', [])
        references = {(field.idnum, field.generation) for field in canonical}
        annotations = [annotation for page in reader.pages for annotation in page.get('/Annots', []) if annotation.get_object().get('/Subtype') == '/Widget']
        self.check(references == {(annotation.idnum, annotation.generation) for annotation in annotations}, 'AcroForm and page widgets are the exact same merged objects')
        return fields, {str(annotation.get_object()['/T']): annotation.get_object() for annotation in annotations}

    def semantic(self, case, doc, reader, elements, gallery):
        case_id = case['id']
        roles = Counter(str(node['/S']) for node in elements)
        text = ''.join(doc.itertext())
        if case_id == 'structure':
            self.check(roles['/H1'] == 1 and roles['/H2'] == 2 and len(self.elements(doc, 'h2')) == 2, 'headings preserve authored hierarchy')
            self.check('decorative page banner' in text and 'PDFToolkit / real tagged PDF demonstration' not in text, 'artifact banner omitted; explanation remains')
        elif case_id == 'table-listes':
            header_ids = {node.get('/ID') for node in elements if node['/S'] == '/TH'}
            self.check(len(header_ids) == 3 and all(self.attributes(node, '/Table').get('/Scope') == '/Column' for node in elements if node['/S'] == '/TH'), 'PDF table column scope and IDs')
            cells = [node for node in elements if node['/S'] == '/TD']
            self.check(len(cells) == 9 and all(len(self.attributes(node, '/Table').get('/Headers', [])) == 1 and set(self.attributes(node, '/Table')['/Headers']) <= header_ids for node in cells), 'PDF cells reference source header IDs')
            headers = {node.attrib['id'] for node in self.elements(doc, 'th')}
            self.check(len(headers) == 3 and all(node.attrib.get('scope') == 'col' for node in self.elements(doc, 'th')), 'HTML table headers preserve column scope')
            self.check(len(self.elements(doc, 'td')) == 9 and all(node.attrib.get('headers') in headers for node in self.elements(doc, 'td')), 'all nine HTML cells reference existing headers')
            self.check(len(self.elements(doc, 'caption')) == 1 and len(self.elements(doc, 'ol')) == 1 and len(self.elements(doc, 'li')) == 2, 'caption and numbered list survive')
        elif case_id == 'mathml':
            formula = next(node for node in elements if node['/S'] == '/Formula')
            associated = formula['/AF'][0].get_object()
            self.check(associated['/AFRelationship'] == '/Supplement', 'MathML is a genuine PDF associated supplement')
            math = associated['/EF']['/F'].get_object().get_data()
            self.check(ET.fromstring(math).tag == '{http://www.w3.org/1998/Math/MathML}math', 'source associated bytes contain MathML')
            mathematics = self.elements(doc, 'math')
            self.check(len(mathematics) == 1 and mathematics[0].tag == '{http://www.w3.org/1998/Math/MathML}math' and mathematics[0].attrib.get('display') == 'block', 'native block MathML namespace')
            self.check(len(self.elements(doc, 'mfrac')) == len(self.elements(doc, 'msup')) == 1, 'native fraction and exponent')
        elif case_id == 'mathml-se':
            namespace = 'http://www.w3.org/1998/Math/MathML'
            source_math = [node for node in elements if node['/S'] == '/math']
            self.check(len(source_math) == 3 and all(node['/NS']['/NS'] == namespace for node in source_math), 'LaTeX supplies three real MathML namespace structure elements')
            self.check(all(not node.get('/AF') for node in elements), 'MathML SE example has no element-associated MathML files')
            self.check(reader.metadata.get('/Producer', '').startswith('luahbtex-') and reader.metadata.get('/Creator') == 'LaTeX', 'source PDF records its actual LaTeX producer')
            math = self.elements(doc, 'math')
            self.check([node.attrib.get('id') for node in math] == [str(node['/ID']) for node in source_math], 'derived MathML retains the original PDF structure IDs')
            self.check([node.attrib.get('display', 'inline') for node in math] == ['inline', 'block', 'block'], 'LaTeX inline and displayed mathematics remain distinct')
            self.check([''.join(node.itertext()) for node in math] == ['𝑥2+12', '𝐸=𝑚𝑐2+12', '(1234)'], 'LaTeX mathematical Unicode and token order are preserved')
            self.check(len(self.elements(doc, 'mfrac')) == len(self.elements(doc, 'msup')) == 2 and len(self.elements(doc, 'mtable')) == 1 and len(self.elements(doc, 'mtr')) == 2 and len(self.elements(doc, 'mtd')) == 4, 'LaTeX fractions, exponents and two-by-two matrix retain their structure')
            provenance_bytes = self.path(gallery, case['files']['latexProvenance']['path']).read_bytes()
            provenance = json.loads(provenance_bytes)
            fixture = provenance['fixtures']['mathml-se']
            self.check(self.digest(provenance_bytes) == '8aad02c607e912e53b7b65da0622d022a7ed50641cd8934b4a715b8d7fd00ef3', 'retained LaTeX compiler and package provenance is unchanged')
            self.check(fixture['pdf']['sha256'] == case['files']['pdf']['sha256'] and fixture['source']['sha256'] == case['files']['code']['sha256'], 'downloaded PDF and TeX match the actual LaTeX generation')
            self.check(fixture['mode'] == 'mathml-SE' and fixture['independentCleanBuildsIdentical'] is True and provenance['passes'] == 2, 'MathML SE fixture records two identical independent clean builds')
        elif case_id == 'formulaire-reset':
            fields, widgets = self.widgets(reader)
            self.check(set(fields) == {'Name', 'Language', 'ResetName'}, 'three canonical form fields')
            self.check(fields['Name']['/V'] == widgets['Name']['/V'] == 'Grace Hopper' and fields['Name']['/DV'] == 'Ada Lovelace', 'PDF current and default values remain distinct')
            self.check(fields['Language']['/V'] == 'en' and list(widgets['ResetName']['/A']['/Fields']) == ['Name'], 'reset selection excludes Language')
            self.check(widgets['ResetName']['/A']['/S'] == '/ResetForm' and all('/AP' in widget and '/N' in widget['/AP'] for widget in widgets.values()), 'real reset action and normal PDF appearances')
            input_name = next(node for node in self.elements(doc, 'input') if node.attrib.get('name') == 'Name')
            self.check(input_name.attrib.get('value') == 'Grace Hopper' and input_name.attrib.get('aria-label') == 'Your name', 'HTML current value and accessible input name')
            self.check(len(self.elements(doc, 'select')) == 1 and len(self.elements(doc, 'option')) == 2, 'choice field options preserved')
            button = next(node for node in self.elements(doc, 'button') if node.attrib.get('name') == 'ResetName')
            self.check(button.attrib.get('type') == 'reset' and button.attrib.get('data-pdf-form-action') == 'ResetForm', 'HTML reset binds the PDF action')
            scripts = self.elements(doc, 'script')
            assets = case['files']['assets']
            self.check(len(scripts) == len(assets) == 1 and assets[0]['mediaType'] == 'text/javascript', 'one explicit library reset script')
            self.check(re.fullmatch(r'pdf-script-[a-f0-9]{64}\.js', scripts[0].attrib.get('src', '')) is not None and PurePosixPath(assets[0]['path']).name == scripts[0].attrib['src'], 'reset script is exactly the inventoried asset')
            data = self.path(gallery, assets[0]['path']).read_bytes()
            self.check(self.digest(data) in scripts[0].attrib['src'] and b'Ada Lovelace' in data, 'runtime hash and PDF default value')
        elif case_id == 'apparences':
            fields, widgets = self.widgets(reader)
            self.check(set(fields) == {'Appearance'}, 'one real push button field')
            widget = widgets['Appearance']
            self.check(widget['/H'] == '/P' and set(widget['/AP']) == {'/N', '/R', '/D'}, 'PDF owns normal, rollover and down appearances')
            appearances = [widget['/AP'][key].get_object().get_data() for key in ('/N', '/R', '/D')]
            self.check(len(set(appearances)) == 3, 'three distinct source appearance programs')
            states = {node.attrib['data-pdf-widget-appearance'] for node in doc.iter() if 'data-pdf-widget-appearance' in node.attrib}
            self.check(states == {'normal', 'rollover', 'down'} and len(self.elements(doc, 'img')) == 3, 'three HTML appearance images under a native button')
        elif case_id == 'graphique':
            figure = next(node for node in elements if node['/S'] == '/Figure')
            self.check('Research 72' in figure['/Alt'] and '/BBox' in self.attributes(figure, '/Layout'), 'source figure owns its bounds and alternate text')
            self.check(len(self.elements(doc, 'figure')) == 1 and len(self.elements(doc, 'img')) == 1 and 'surrounding explanation remains selectable' in text, 'complete graphic isolated while prose remains HTML')
        elif case_id in {'jpeg', 'jpeg2000', 'jbig2'}:
            self.image_samples(case, doc, reader, gallery)
        elif case_id == 'signature':
            self.check(case['files']['pdf']['sha256'] == self.SIGNATURE_HASH and case['files']['certificate']['sha256'] == self.CERTIFICATE_HASH, 'unchanged published signature fixture and public certificate')
            button = next(node for node in self.elements(doc, 'button') if 'data-pdf-signature-status' in node.attrib)
            self.check(button.attrib['data-pdf-signature-status'] == 'integrity-verified', 'explicit provider reports signature integrity')
            popover = next(node for node in doc.iter() if node.attrib.get('id') == button.attrib.get('popovertarget'))
            self.check(popover.attrib.get('popover') == 'auto' and 'not signed' in ''.join(popover.itertext()), 'signature explanation is a native popover with HTML caveat')
        self.report['cases'].append({'id': case_id, 'profile': case['profile'], 'sourceSha256': case['files']['pdf']['sha256'], 'htmlSha256': case['files']['html']['sha256'], 'structureRoles': dict(roles), 'pass': True})

    def image_samples(self, case, doc, reader, gallery):
        expected = case['expected']['image']
        source = reader.pages[0]['/Resources']['/XObject']['/Example'].get_object()
        original = self.path(gallery, case['files']['encodedImage']['path']).read_bytes()
        provenance = json.loads(self.path(gallery, case['files']['imageProvenance']['path']).read_text())
        self.check(str(source['/Filter']) == '/' + expected['filter'] and source._data == original,
                   case['id'] + ': source PDF retains the actual advertised compressed bytes')
        dimensions = (160, 80) if case['id'] == 'jpeg2000' else (320, 160)
        self.check((source['/Width'], source['/Height']) == (expected['width'], expected['height']) == dimensions,
                   case['id'] + ': explicit source image dimensions')
        self.check(list(source.get('/Decode', [])) == (expected.get('pdfDecode') or []),
                   case['id'] + ': explicit PDF Decode mapping')
        self.check(provenance['license'] == 'MIT' and provenance['image']['encoded']['sha256'] == self.digest(original),
                   case['id'] + ': original artwork and encoder provenance')
        images = self.elements(doc, 'img')
        self.check(len(images) == 1 and len(case['files']['assets']) == 1,
                   case['id'] + ': one actual decoded image, with selectable surrounding text')
        raw = base64.b64decode(images[0].attrib['src'].split(',', 1)[1], validate=True)
        self.check(raw == self.path(gallery, case['files']['assets'][0]['path']).read_bytes(),
                   case['id'] + ': displayed and downloadable pixels use identical PNG bytes')
        reference_path = self.path(gallery, case['files']['referenceImage']['path'])
        self.check(self.digest(reference_path.read_bytes()) == provenance['image']['expected']['sha256'],
                   case['id'] + ': independent pixel reference matches retained provenance')
        with Image.open(io.BytesIO(raw)) as actual, Image.open(reference_path) as reference:
            self.check(actual.size == reference.size == dimensions, case['id'] + ': decoded native pixel dimensions')
            difference = ImageChops.difference(actual.convert('RGB'), reference.convert('RGB'))
            maximum = max(upper for lower, upper in difference.getextrema())
            tolerance = 3 if case['id'] == 'jpeg' else 0
            self.check(expected['maximumPixelError'] == tolerance and maximum <= tolerance,
                       case['id'] + ': independent decoded pixel comparison', {'maximumError': maximum, 'allowed': tolerance})

    def run(self):
        application = json.loads((self.root / 'demo-manifest.json').read_text())
        self.check(application['schemaVersion'] == 1, 'application manifest schema')
        self.inventory(self.root, application['assets'], {'demo-manifest.json', 'index.html', 'fr/index.html'})
        gallery_path = self.path(self.root, application['gallery'])
        gallery = gallery_path.parent
        manifest = json.loads(gallery_path.read_text())
        self.check(manifest['schemaVersion'] == 1 and manifest['generator']['package'] == 'pdftoolkit/pdf-to-html-demo', 'gallery schema and package')
        self.check(manifest['htmlPackage'] == application['htmlPackage'] == {'version': '0.8.1', 'revision': self.HTML_REVISION}, 'exact released HTML package identity')
        self.check(manifest['generator']['version'] == application['application']['version'] and manifest['generator']['commit'] == application['application']['revision'], 'application and gallery provenance agree')
        draft = manifest.get('draft', False)
        self.check(draft == application['application']['draft'], 'consistent draft status')
        self.check((draft and manifest['generator']['commit'] is None) or (not draft and re.fullmatch(r'[a-f0-9]{40}', manifest['generator']['commit'] or '') is not None), 'truthful generator revision')
        self.check(not self.args.require_release or not draft, 'release-only mode excludes drafts')
        self.report.update({'draft': draft, 'publicationEligible': not draft, 'generator': manifest['generator'], 'htmlPackage': manifest['htmlPackage']})
        browser_preview = manifest.get('browserPreview', {})
        self.check(browser_preview.get('engine') == 'chromium' and browser_preview.get('playwright') == '1.62.1' and isinstance(browser_preview.get('version'), str) and bool(browser_preview['version']) and browser_preview.get('htmlRetouched') is False, 'HTML preview browser and untouched document provenance')
        self.check(640 <= browser_preview.get('viewportWidth', 0) <= 900 and browser_preview.get('deviceScaleFactor') == 1, 'HTML preview viewport is declared and bounded')
        self.report['browserPreview'] = browser_preview
        assets = self.inventory(gallery, manifest['assets'], {'gallery-manifest.json'})
        self.check({case['id'] for case in manifest['cases']} == self.CASES and len(manifest['cases']) == 11, 'eleven stable gallery cases')
        self.report['tools']['poppler'] = self.command([self.args.pdftoppm, '-v']).stderr.decode().splitlines()[0]
        for case in manifest['cases']:
            for key in ('title', 'description', 'observations'):
                self.check(set(case[key]) == {'en', 'fr'} and all(case[key].values()), case['id'] + ': bilingual ' + key)
            files = [value for key, value in case['files'].items() if key != 'assets'] + case['files']['assets'] + case['pages']
            for item in files:
                self.check(all(item[key] == assets[item['path']][key] for key in ('path', 'bytes', 'sha256', 'mediaType')), case['id'] + ': artifact reference matches inventory', item['path'])
            self.check(case['files']['html']['path'].endswith('.html.txt') and case['files']['html']['mediaType'] == 'text/plain' and case['files']['code']['path'].endswith('.tex.txt' if case['id'] == 'mathml-se' else '.php.txt') and case['files']['code']['mediaType'] == 'text/plain', case['id'] + ': HTML and code are inert text downloads')
            provenance = case['source']
            if provenance['kind'] == 'generated':
                self.check(all(provenance[key] == manifest['generator'][key] for key in ('package', 'version', 'commit')), case['id'] + ': generated source provenance')
            else:
                fixture_paths = {'signature': 'tests/Fixtures/signatures/signed-padded.pdf', 'mathml-se': 'tests/Fixtures/mathml-latex/mathml-se.pdf'}
                self.check(case['id'] in fixture_paths and provenance == {'kind': 'published-fixture', 'package': 'pdftoolkit/pdf-to-html', 'version': '0.8.1', 'commit': self.HTML_REVISION, 'path': fixture_paths.get(case['id'])}, case['id'] + ': published source provenance')
            preview = case['files'].get('htmlPreview')
            self.check(isinstance(preview, dict) and preview.get('path') == case['id'] + '/html-preview.png' and preview.get('mediaType') == 'image/png', case['id'] + ': actual HTML browser preview is present')
            with Image.open(self.path(gallery, preview['path'])) as screenshot:
                screenshot.load()
                self.check(screenshot.format == 'PNG' and screenshot.size == (preview['width'], preview['height']) and 0 < screenshot.width <= 900 and 0 < screenshot.height <= 4096, case['id'] + ': HTML preview dimensions and PNG format')
                self.check(max(ImageStat.Stat(screenshot.convert('RGB')).var) > 10, case['id'] + ': HTML preview is nonblank')
            pdf = self.path(gallery, case['files']['pdf']['path'])
            reader = PdfReader(pdf, strict=True)
            self.check(not reader.is_encrypted and reader.trailer['/Root']['/MarkInfo']['/Marked'] == True, case['id'] + ': unencrypted tagged source PDF')
            elements = self.source_structure(reader)
            self.check(bool(elements), case['id'] + ': genuine PDF structure elements')
            if provenance['kind'] == 'generated':
                self.check(b'/Artifact' in reader.pages[0].get_contents().get_data(), case['id'] + ': decorative PDF artifact is authored')
            self.source_pages(case, reader, pdf, gallery)
            html = self.path(gallery, case['files']['html']['path']).read_text()
            doc = self.html(case, html)
            self.semantic(case, doc, reader, elements, gallery)
            diagnostics = json.loads(self.path(gallery, case['files']['diagnostics']['path']).read_text())
            self.check(diagnostics['profile'] == case['profile'] and diagnostics['sourceSha256'] == case['files']['pdf']['sha256'] and diagnostics['htmlSha256'] == case['files']['html']['sha256'] and isinstance(diagnostics['diagnostics'], list), case['id'] + ': diagnostics retain exact conversion identity')
        self.check(all(not path.name.lower().endswith(('.key', '.pem', '.p12', '.pfx')) for path in self.root.rglob('*')), 'no private-key container in published files')
        self.report['limits'] = ['HTML5 parser and PDF/PNG oracles complement browser interaction tests; they do not establish accessibility certification or universal PDF equivalence.', 'Independent Poppler rendering validates page dimensions and nonblank pixels, not pixel identity across substituted fonts.', 'Signature assertions verify retained fixture provenance and converter output; they do not independently establish certificate trust, revocation or later-change permissions.']
        self.report['status'] = 'pass'
        return self.report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dist', type=Path)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--pdftoppm', default='pdftoppm')
    parser.add_argument('--require-release', action='store_true')
    args = parser.parse_args()
    validator = DemoValidation(args)
    try:
        validator.run()
    except Exception as error:
        validator.report.update({'status': 'fail', 'error': str(error), 'errorType': type(error).__name__})
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(validator.report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({'status': validator.report['status'], 'checks': len(validator.report['checks']), 'cases': len(validator.report['cases']), 'report': str(args.report)}))
    return 0 if validator.report['status'] == 'pass' else 1


if __name__ == '__main__':
    sys.exit(main())
