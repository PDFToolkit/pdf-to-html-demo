<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

use PDF\Document\Images\ImageDimensions;
use PDF\Document\Resources\XObject;
use PDF\Graphics\ColourSpaces\ColourSpaceFamily;
use PDF\Graphics\ColourSpaces\DeviceColourSpace;
use PDF\Graphics\CoordinateSystems\Matrix;
use PDF\Graphics\XObjects\EncodedImageXObject;
use PDF\Graphics\XObjects\ImageDecode;
use PDF\Graphics\Patterns\Shadings\DecodeInterval;
use PDF\Syntax\ContentStreamsResources\Operators as Op;
use PDF\Syntax\Filters\EncodedData;
use PDF\Syntax\Filters\FilterName;
use PDF\Syntax\Object\IndirectReference;
use PDF\Syntax\Object\IntegerType;
use PDF\Syntax\Object\NameType;
use PDF\Syntax\Object\NumericType;

/** Real image streams are placed in a tagged figure; no output HTML is authored here. */
final readonly class ImageCaseFactory
{
    public function __construct(private PdfScene $scene = new PdfScene())
    {
    }

    public function create(ImageFixture $fixture): GalleryCase
    {
        $s = $this->scene;
        [$label, $filter] = match ($fixture->id) {
            'jpeg' => ['JPEG', FilterName::DCTDecode],
            'jpeg2000' => ['JPEG 2000', FilterName::JPXDecode],
            'jbig2' => ['JBIG2', FilterName::JBIG2Decode],
        };
        $image = new EncodedImageXObject(
            $fixture->bytes,
            new ImageDimensions(320, 160),
            new EncodedData($filter),
            new DeviceColourSpace($fixture->id === 'jbig2' ? ColourSpaceFamily::DeviceGray : ColourSpaceFamily::DeviceRGB),
            new IntegerType($fixture->id === 'jbig2' ? 1 : 8),
            decode: $fixture->id === 'jpeg' ? new ImageDecode(...array_fill(0, 3, new DecodeInterval(new NumericType(1), new NumericType(0)))) : null,
        );
        $resources = $s->resources->with(new XObject($s->dictionary(['Example' => new IndirectReference($image)])));
        $figure = new PdfNode(
            'Figure',
            paint: [
            new Op\SaveGraphicsState(), new Op\ConcatenateMatrix(new Matrix(...array_map(static fn (int $value): NumericType => new NumericType($value), [480, 0, 0, 240, 48, 365]))),
            new Op\InvokeXObject(new NameType('Example')), new Op\RestoreGraphicsState(),
        ],
            attributes: [$s->dictionary(['O' => new NameType('Layout'), 'BBox' => $s->rectangle(48, 365, 528, 605), 'Placement' => new NameType('Block'), 'Height' => new NumericType(240)]), $s->css(['margin' => '24px 0', 'max-width' => '100%'])],
            alt: 'PDFToolkit illustration: five bars and a check mark.'
        );
        $nodes = [$s->paragraph($label . ' pixels, decoded in PHP', 716, 'H1', 25),
            $s->paragraph('One encoded image, read from the actual PDF stream.', 670), $figure,
            $s->paragraph('The image is decoded locally. This paragraph remains text.', 320)];
        return new GalleryCase(
            $fixture->id,
            $s->build($label . ' pixels, decoded in PHP', $nodes, $resources),
            ['en' => $label . ' without a native image engine', 'fr' => $label . ' sans moteur d’image natif'],
            ['en' => 'The PDF image stream becomes a PNG through the same PHP decoder in native execution and WebAssembly.', 'fr' => 'Le flux image PDF devient un PNG par le même décodeur PHP en exécution native et dans WebAssembly.'],
            ['en' => ['Import this PDF to reproduce the gallery result locally.', $fixture->id === 'jpeg' ? 'The PDF Decode array reverses the encoded colours, requiring actual PHP decoding.' : 'The original encoded image and an independent pixel reference accompany the example.', $fixture->id === 'jpeg' ? 'JPEG is lossy; the reference is an independent JPEG decoding, not the precompression artwork.' : 'This example uses lossless image coding; pixel samples are compared exactly.'],
             'fr' => ['Importer ce PDF pour reproduire localement le résultat de la galerie.', $fixture->id === 'jpeg' ? 'Le tableau Decode du PDF inverse les couleurs compressées, ce qui exige un vrai décodage PHP.' : 'L’image compressée originale et une référence indépendante des pixels accompagnent le cas.', $fixture->id === 'jpeg' ? 'JPEG est avec pertes ; la référence est un décodage JPEG indépendant, pas le dessin avant compression.' : 'Ce cas utilise un codage sans perte ; les échantillons de pixels sont comparés exactement.']],
            capabilities: ['pure-php-image-codecs'],
            expected: ['tags' => ['figure', 'img', 'p'], 'scripts' => false, 'image' => ['filter' => $filter->value, 'width' => 320, 'height' => 160, 'maximumPixelError' => $fixture->provenance['image']['maximumPixelError'], 'pdfDecode' => $fixture->provenance['image']['pdfDecode']]],
            image: $fixture,
        );
    }
}
