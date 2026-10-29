#!/usr/bin/env python3
"""Create original gallery artwork and independently encode JPEG/JP2/JBIG2 inputs.

Development tool only. Runtime conversion never invokes Pillow or libtiff.
JBIG2 uses one generic MMR region (T.88, 7.3, 7.4.6 and 7.4.8).
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import struct

from PIL import Image, ImageDraw, ImageFont, ImageOps, features
import PIL


class ImageExamples:
    def __init__(self, output):
        self.output = output
        self.output.mkdir(parents=True, exist_ok=True)

    def write(self, name, data):
        (self.output / name).write_bytes(data)
        return {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

    @staticmethod
    def encode(image, format, **options):
        buffer = io.BytesIO()
        image.save(buffer, format=format, **options)
        return buffer.getvalue()

    def artwork(self, monochrome=False):
        image = Image.new('1' if monochrome else 'RGB', (320, 160), 1 if monochrome else '#edf5fb')
        draw = ImageDraw.Draw(image)
        ink = 0 if monochrome else '#123b5b'
        draw.rectangle((8, 8, 311, 151), outline=ink, width=2)
        draw.text((22, 18), 'PDFToolkit', fill=ink, font=ImageFont.load_default(size=25))
        draw.text((22, 52), 'Pixels remain pixels', fill=ink, font=ImageFont.load_default(size=14))
        for index, height in enumerate((25, 43, 61, 35, 54)):
            x = 25 + index * 39
            color = ink if monochrome else ('#226e9c', '#229476', '#db8b29', '#9b548f', '#123b5b')[index]
            draw.rectangle((x, 135 - height, x + 25, 135), fill=color)
        draw.ellipse((235, 83, 288, 136), outline=ink, width=4)
        draw.line((242, 110, 253, 123, 280, 94), fill=ink, width=4)
        return image

    @staticmethod
    def segment(number, kind, payload=b''):
        # Short header: no references, retained segment, one-byte page association.
        return struct.pack('>IBBBI', number, kind, 1, 1, len(payload)) + payload

    def jbig2(self, image):
        # TIFF's black-is-zero sample convention is opposite to JBIG2's black bit.
        tiff = self.encode(ImageOps.invert(image.convert('L')).convert('1'), 'TIFF', compression='group4')
        with Image.open(io.BytesIO(tiff)) as parsed:
            offsets, sizes = parsed.tag_v2[273], parsed.tag_v2[279]
            if len(offsets) != 1 or len(sizes) != 1:
                raise ValueError('The illustration requires one independently encoded MMR strip.')
            mmr = tiff[offsets[0]:offsets[0] + sizes[0]]
        width, height = image.size
        page = struct.pack('>IIIIBH', width, height, 0, 0, 0, 0)
        region = struct.pack('>IIIIBB', width, height, 0, 0, 0, 1) + mmr
        return self.segment(1, 48, page) + self.segment(2, 39, region) + self.segment(3, 49)

    def run(self):
        rgb, bilevel = self.artwork(), self.artwork(True)
        self.write('original-rgb.png', self.encode(rgb, 'PNG'))
        # The browser keeps its 30-second budget, including a cold PHP runtime.
        # This smaller lossless JPX witness remains practical on slower CPUs.
        jpx = rgb.resize((160, 80), Image.Resampling.LANCZOS)
        jpx_original = self.write('jpeg2000-expected.png', self.encode(jpx, 'PNG'))
        mono = self.write('original-bilevel.png', self.encode(bilevel, 'PNG'))
        cases = []
        for name, image, data, suffix, filter, tolerance in (
            ('jpeg', rgb, self.encode(ImageOps.invert(rgb), 'JPEG', quality=90, subsampling=0, optimize=False), 'jpg', 'DCTDecode', 3),
            ('jpeg2000', jpx, self.encode(jpx, 'JPEG2000', irreversible=False, mct=1), 'jp2', 'JPXDecode', 0),
            ('jbig2', bilevel, self.jbig2(bilevel), 'jb2', 'JBIG2Decode', 0),
        ):
            encoded = self.write(name + '.' + suffix, data)
            if name == 'jpeg':
                with Image.open(io.BytesIO(data)) as decoded:
                    expected = self.write(name + '-expected.png', self.encode(ImageOps.invert(decoded.convert('RGB')), 'PNG'))
            else:
                expected = jpx_original if name == 'jpeg2000' else mono
            cases.append({'id': name, 'width': image.width, 'height': image.height, 'filter': filter,
                          'encoded': encoded, 'expected': expected, 'maximumPixelError': tolerance, 'pdfDecode': [1, 0] * 3 if name == 'jpeg' else None})
        manifest = {'schemaVersion': 1, 'license': 'MIT', 'artwork': 'Original PDFToolkit geometric illustration; no third-party image or document.',
                    'generator': 'tools/generate_image_examples.py', 'tools': {'Pillow': PIL.__version__,
                    'libjpeg': features.version_codec('jpg'), 'OpenJPEG': features.version_codec('jpg_2000'),
                    'libtiff': features.version_codec('libtiff')}, 'cases': cases}
        (self.output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        print(json.dumps({'cases': len(cases), 'output': str(self.output), 'tools': manifest['tools']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'resources/images')
    ImageExamples(parser.parse_args().output).run()
