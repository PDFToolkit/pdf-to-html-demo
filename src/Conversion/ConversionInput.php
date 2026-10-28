<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Conversion;

final readonly class ConversionInput
{
    public const MAXIMUM_BYTES = 8 * 1024 * 1024;

    public function __construct(public string $bytes, public string $filename)
    {
        if ($bytes === '' || strlen($bytes) > self::MAXIMUM_BYTES) {
            throw new ConversionFailure('file_size', 'Choose a nonempty PDF of at most 8 MiB.');
        }
        if (!str_starts_with($bytes, '%PDF-')) {
            throw new ConversionFailure('invalid_pdf', 'The selected file does not begin with a PDF header.');
        }
        if ($filename === '' || strlen($filename) > 255 || preg_match('/[\x00-\x1f\x7f\/\\\\]/', $filename) === 1 || !mb_check_encoding($filename, 'UTF-8')) {
            throw new ConversionFailure('invalid_request', 'Supply a UTF-8 PDF filename without path separators or control characters.');
        }
    }
}
