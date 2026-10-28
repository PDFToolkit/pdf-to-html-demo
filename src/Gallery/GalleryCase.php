<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

final readonly class GalleryCase
{
    /** @param array{en:string,fr:string} $title @param array{en:string,fr:string} $description @param array{en:list<string>,fr:list<string>} $observations @param list<string> $capabilities @param array<string,mixed> $expected */
    public function __construct(public string $id, public string $pdf, public array $title, public array $description, public array $observations, public string $profile = 'basic', public array $capabilities = [], public array $expected = [], public ?string $certificate = null, public ?string $fixturePath = null, public ?ImageFixture $image = null)
    {
        if (preg_match('/^[a-z][a-z0-9-]*$/D', $id) !== 1 || !str_starts_with($pdf, '%PDF-')) {
            throw new \InvalidArgumentException('A gallery case requires a stable identifier and real PDF bytes.');
        }
    }
}
