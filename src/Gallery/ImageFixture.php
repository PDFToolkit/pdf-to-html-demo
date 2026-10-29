<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

/** Original encoded artwork and its independent pixel reference, owned by one build. */
final readonly class ImageFixture
{
    /** @param array<string,mixed> $provenance */
    public function __construct(public string $id, public string $bytes, public string $referencePng, public int $width, public int $height, public array $provenance)
    {
        if (!in_array($id, ['jpeg', 'jpeg2000', 'jbig2'], true) || $bytes === '' || !str_starts_with($referencePng, "\x89PNG\r\n\x1a\n") || $width < 1 || $height < 1 || $width > 320 || $height > 160) {
            throw new \InvalidArgumentException('A gallery image requires its original encoded bytes and PNG oracle.');
        }
    }
}
