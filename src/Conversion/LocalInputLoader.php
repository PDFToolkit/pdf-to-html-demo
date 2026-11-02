<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Conversion;

/** Reads only the local paths explicitly provided by the application boundary. */
final readonly class LocalInputLoader
{
    public function load(string $inputPath, string $requestPath): ConversionInput
    {
        $request = json_decode($this->bytes($requestPath, 2048), true, flags: JSON_THROW_ON_ERROR);
        if (!is_array($request) || !is_string($request['filename'] ?? null)) {
            throw new ConversionFailure('invalid_request', 'A filename is required.');
        }

        return new ConversionInput($this->bytes($inputPath, ConversionInput::MAXIMUM_BYTES), $request['filename']);
    }

    private function bytes(string $path, int $maximum): string
    {
        if (!stream_is_local($path) || !is_file($path)) {
            throw new ConversionFailure('invalid_request', 'The local input is missing.');
        }
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new ConversionFailure('invalid_request', 'The local input cannot be read.');
        }
        try {
            $bytes = stream_get_contents($stream, $maximum + 1);
        } finally {
            fclose($stream);
        }
        if ($bytes === false || strlen($bytes) > $maximum) {
            throw new ConversionFailure('file_size', 'The input exceeds the demo byte limit.');
        }

        return $bytes;
    }
}
