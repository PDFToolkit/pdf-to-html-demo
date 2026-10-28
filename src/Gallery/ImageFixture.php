<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

/** Original encoded artwork and its independent pixel reference, owned by one build. */
final readonly class ImageFixture
{
    /** @param array<string,mixed> $provenance */
    public function __construct(public string $id, public string $bytes, public string $referencePng, public array $provenance)
    {
        if (!in_array($id, ['jpeg', 'jpeg2000', 'jbig2'], true) || $bytes === '' || !str_starts_with($referencePng, "\x89PNG\r\n\x1a\n")) {
            throw new \InvalidArgumentException('A gallery image requires its original encoded bytes and PNG oracle.');
        }
    }
}
