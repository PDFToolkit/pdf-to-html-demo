<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Inspection;

use PDF\Reading\EncryptedPdfException;
use PDF\Reading\FileBytes;
use PDF\Reading\Inspection\DocumentInspector;
use PDF\Reading\Inspection\InspectionLimits;
use PDF\Reading\ParseException;
use PDFToolkit\Demo\Conversion\ConversionFailure;
use PDFToolkit\Demo\Conversion\ConversionInput;
use PDFToolkit\Demo\Conversion\ReaderFactory;

/** Same source inspection in native gallery builds and isolated browser Workers. */
final readonly class Inspector
{
    public const MAXIMUM_OUTPUT_BYTES = 8 * 1024 * 1024;

    public function __construct(private ReaderFactory $readers = new ReaderFactory())
    {
    }

    public function inspect(ConversionInput $input): InspectionOutput
    {
        try {
            $document = $this->readers->create()->read(new FileBytes($input->bytes));
            $inspection = (new DocumentInspector(new InspectionLimits(
                maxDepth: 48,
                maxNodes: 5000,
                maxPages: 100,
                maxObjects: 2000,
                maxValues: 20000,
                maxBytes: 2 * 1024 * 1024,
                maxStringBytes: 4096,
                maxAssociations: 1000,
                maxDiagnostics: 100,
            )))->inspect($document);
            $output = new InspectionOutput(hash('sha256', $input->bytes), strlen($input->bytes), $inspection);
            if (strlen(json_encode($output, JSON_THROW_ON_ERROR)) > self::MAXIMUM_OUTPUT_BYTES) {
                throw new ConversionFailure('resource_limit', 'The PDF inspection exceeds the demo output limit.');
            }

            return $output;
        } catch (EncryptedPdfException) {
            throw new ConversionFailure('encrypted_pdf', 'The browser demo does not authenticate encrypted PDF documents.');
        } catch (ParseException) {
            throw new ConversionFailure('invalid_pdf', 'The PDF cannot be read safely for inspection.');
        }
    }
}
