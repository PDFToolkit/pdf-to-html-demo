<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Conversion;

use PDF\Reading\DocumentReader;
use PDF\Reading\ImageCodecs\ImageLimits;
use PDF\Reading\ImageCodecs\PhpDecoder;
use PDF\Reading\ReaderLimits;

/** The native gallery and isolated Worker use the same bounded, process-free codecs. */
final readonly class ReaderFactory
{
    public function create(): DocumentReader
    {
        return new DocumentReader(
            limits: new ReaderLimits(
                maxFileBytes: ConversionInput::MAXIMUM_BYTES,
                maxDepth: 64,
                maxTokenBytes: 1024 * 1024,
                maxContainerEntries: 30000,
                maxObjects: 30000,
                maxCrossReferenceEntries: 60000,
                maxRevisions: 16,
                maxDecodedStreamBytes: 16 * 1024 * 1024,
                maxTotalDecodedBytes: 32 * 1024 * 1024,
                maxFilters: 8,
                maxParsedValues: 150000,
                maxRetainedBytes: 32 * 1024 * 1024,
            ),
            imageDecoder: new PhpDecoder(),
            imageLimits: new ImageLimits(
                maxPixels: 1024 * 1024,
                maxDimension: 4096,
                maxComponents: 4,
                maxWork: 20000000,
                maxMemoryBytes: 64 * 1024 * 1024,
                maxSegments: 10000,
                maxMetadataBytes: 1024 * 1024,
                maxTiles: 256,
            ),
        );
    }
}
