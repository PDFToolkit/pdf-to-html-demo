<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use PDFToolkit\Demo\Conversion\ConversionInput;
use PDFToolkit\Demo\Conversion\Converter;
use PDFToolkit\Demo\Gallery\GalleryConversion;
use PDFToolkit\Demo\Gallery\ImageCaseFactory;
use PDFToolkit\Demo\Gallery\ImageFixtures;

/** Exercise actual encoded PDF streams through the shared native/browser profile. */
final class ImageConversionChecks
{
    private int $checks = 0;

    public function run(): void
    {
        $fixtures = (new ImageFixtures(dirname(__DIR__) . '/resources/images'))->read();
        $cases = [];
        foreach ($fixtures as $fixture) {
            $case = (new ImageCaseFactory())->create($fixture);
            $result = (new Converter())->convert(new ConversionInput($case->pdf, $case->id . '.pdf'))->jsonSerialize();
            $gallery = (new GalleryConversion())->convert($case);
            $this->check($result['html'] === $gallery->html, 'Native gallery and browser conversion profile return identical HTML.');
            $this->check(count($result['assets']) === 1 && $result['assets'][0]['mediaType'] === 'image/png', 'The encoded image is actually decoded into one PNG.');
            $bytes = base64_decode($result['assets'][0]['base64'], true);
            $this->check(is_string($bytes) && str_starts_with($bytes, "\x89PNG\r\n\x1a\n"), 'The returned asset contains real PNG bytes.');
            $this->check(str_contains($result['html'], 'data:image/png;base64,' . $result['assets'][0]['base64']), 'The displayed image and downloadable asset have identical bytes.');
            $this->check(str_contains($case->pdf, '/' . $case->expected['image']['filter']), 'The source contains the advertised PDF image filter.');
            $this->check(str_contains($case->pdf, $fixture->bytes), 'The source preserves the original encoded image stream.');
            $this->check(!str_contains($result['html'], '<script') && array_column($result['diagnostics'], 'code') === ['scripts-disabled'], 'No image fallback or active content hides a failed decode.');
            $cases[] = ['id' => $case->id, 'sourceSha256' => hash('sha256', $case->pdf), 'htmlSha256' => hash('sha256', $result['html']), 'pngSha256' => hash('sha256', $bytes)];
        }
        echo json_encode(['passed' => true, 'php' => PHP_VERSION, 'checks' => $this->checks, 'cases' => $cases], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . "\n";
    }

    private function check(bool $condition, string $message): void
    {
        if (!$condition) {
            throw new \RuntimeException($message);
        }
        ++$this->checks;
    }
}

(new ImageConversionChecks())->run();
