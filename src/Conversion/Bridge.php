<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Conversion;

/** Application boundary: reads only the explicitly supplied local input and request files. */
final readonly class Bridge
{
    public function __construct(private Converter $converter = new Converter(), private LocalInputLoader $inputs = new LocalInputLoader())
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
            $input = $this->inputs->load($inputPath, $requestPath);
            return json_encode(['ok' => true, 'result' => $this->converter->convert($input)], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        } catch (ConversionFailure $error) {
            return json_encode(['ok' => false, 'error' => ['code' => $error->errorCode, 'message' => $error->getMessage()]], JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return '{"ok":false,"error":{"code":"invalid_request","message":"The conversion request is not valid JSON."}}';
        } catch (\Throwable) {
            return '{"ok":false,"error":{"code":"conversion_failed","message":"The demo could not convert this PDF safely."}}';
        }
    }
}
