<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Conversion;

/** Application boundary: reads only the explicitly supplied local input and request files. */
final readonly class Bridge
{
    public function __construct(private Converter $converter = new Converter())
    {
    }

    public function run(string $inputPath, string $requestPath): string
    {
        try {
            if (PHP_INT_SIZE !== 8) {
                throw new ConversionFailure('runtime_unavailable', 'This demo requires PHP 8.3 or later with 64-bit integers.');
            }
            foreach (['dom', 'mbstring', 'zlib'] as $extension) {
                if (!extension_loaded($extension)) {
                    throw new ConversionFailure('runtime_unavailable', 'The PHP runtime lacks a required extension.');
                }
            }
            ini_set('memory_limit', '128M');
            set_time_limit(25);
            $request = json_decode($this->localBytes($requestPath, 2048), true, flags: JSON_THROW_ON_ERROR);
            if (!is_array($request) || !is_string($request['filename'] ?? null)) {
                throw new ConversionFailure('invalid_request', 'A filename is required for conversion.');
            }
            $input = new ConversionInput($this->localBytes($inputPath, ConversionInput::MAXIMUM_BYTES), $request['filename']);
            return json_encode(['ok' => true, 'result' => $this->converter->convert($input)], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        } catch (ConversionFailure $error) {
            return json_encode(['ok' => false, 'error' => ['code' => $error->errorCode, 'message' => $error->getMessage()]], JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return '{"ok":false,"error":{"code":"invalid_request","message":"The conversion request is not valid JSON."}}';
        } catch (\Throwable) {
            return '{"ok":false,"error":{"code":"conversion_failed","message":"The demo could not convert this PDF safely."}}';
        }
    }

    private function localBytes(string $path, int $maximum): string
    {
        if (!stream_is_local($path) || !is_file($path)) {
            throw new ConversionFailure('invalid_request', 'The local conversion input is missing.');
        }
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw new ConversionFailure('invalid_request', 'The local conversion input cannot be read.');
        }
        try {
            $bytes = stream_get_contents($stream, $maximum + 1);
        } finally {
            fclose($stream);
        }
        if ($bytes === false || strlen($bytes) > $maximum) {
            throw new ConversionFailure('file_size', 'The conversion input exceeds the demo byte limit.');
        }
        return $bytes;
    }
}
