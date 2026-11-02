<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Inspection;

use PDFToolkit\Demo\Conversion\ConversionFailure;
use PDFToolkit\Demo\Conversion\LocalInputLoader;

/** Inspection has its own result and never depends on successful HTML derivation. */
final readonly class Bridge
{
    public function __construct(private Inspector $inspector = new Inspector(), private LocalInputLoader $inputs = new LocalInputLoader())
    {
    }

    public function run(string $inputPath, string $requestPath): string
    {
        try {
            if (PHP_INT_SIZE !== 8 || !extension_loaded('mbstring') || !extension_loaded('zlib')) {
                throw new ConversionFailure('runtime_unavailable', 'The inspection runtime is unavailable.');
            }
            ini_set('memory_limit', '128M');
            set_time_limit(25);
            $result = $this->inspector->inspect($this->inputs->load($inputPath, $requestPath));

            return json_encode(['ok' => true, 'result' => $result], JSON_THROW_ON_ERROR | JSON_INVALID_UTF8_SUBSTITUTE);
        } catch (ConversionFailure $error) {
            return json_encode(['ok' => false, 'error' => ['code' => $error->errorCode, 'message' => $error->getMessage()]], JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return '{"ok":false,"error":{"code":"invalid_request","message":"The inspection request is not valid JSON."}}';
        } catch (\Throwable) {
            return '{"ok":false,"error":{"code":"inspection_failed","message":"The demo could not inspect this PDF safely."}}';
        }
    }
}
