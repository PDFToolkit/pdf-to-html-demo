<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Conversion;

use PDF\Html\Asset;
use PDF\Html\DerivationResult;
use PDF\Html\Diagnostic;

final readonly class ConversionOutput implements \JsonSerializable
{
    public function __construct(private DerivationResult $result)
    {
    }

    /**
     * @return array{html: string, css: string, assets: list<array{filename: string, mediaType: string, base64: string}>, diagnostics: list<array{code: string, message: string, source: ?string}>}
     */
    public function jsonSerialize(): array
    {
        return [
            'html' => $this->result->html,
            'css' => $this->result->css,
            'assets' => array_map(static fn (Asset $asset): array => [
                'filename' => $asset->filename,
                'mediaType' => $asset->mediaType,
                'base64' => base64_encode($asset->bytes),
            ], $this->result->assets),
            'diagnostics' => array_map(static fn (Diagnostic $diagnostic): array => [
                'code' => $diagnostic->code,
                'message' => $diagnostic->message,
                'source' => $diagnostic->source,
            ], $this->result->diagnostics),
        ];
    }
}
