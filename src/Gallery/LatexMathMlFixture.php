<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

/** Retained LuaLaTeX output, source and build evidence are supplied together. */
final readonly class LatexMathMlFixture
{
    public function __construct(public string $pdf, public string $source, public string $provenance)
    {
        if (!str_starts_with($pdf, '%PDF-2.0') || !str_contains($source, 'math/setup=mathml-SE')) {
            throw new \InvalidArgumentException('The LaTeX example requires its MathML SE PDF and actual source.');
        }
    }
}
