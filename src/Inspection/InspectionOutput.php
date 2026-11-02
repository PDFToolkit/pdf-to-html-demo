<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Inspection;

use PDF\Reading\Inspection\DocumentInspection;

/** Identity describes the original input bytes, never derived or rewritten PDF data. */
final readonly class InspectionOutput implements \JsonSerializable
{
    public function __construct(public string $sha256, public int $bytes, public DocumentInspection $inspection)
    {
    }

    public function jsonSerialize(): array
    {
        return ['source' => ['sha256' => $this->sha256, 'bytes' => $this->bytes], 'inspection' => $this->inspection];
    }
}
