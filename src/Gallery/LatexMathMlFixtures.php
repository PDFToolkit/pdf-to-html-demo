<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

/** Bounded filesystem input for a fixture retained in the released HTML source. */
final readonly class LatexMathMlFixtures
{
    private const PROVENANCE_SHA256 = '8aad02c607e912e53b7b65da0622d022a7ed50641cd8934b4a715b8d7fd00ef3';

    public function __construct(private string $directory)
    {
    }

    public function read(): LatexMathMlFixture
    {
        $provenance = $this->bytes('provenance.json');
        if (!hash_equals(self::PROVENANCE_SHA256, hash('sha256', $provenance))) {
            throw new \RuntimeException('The LaTeX fixture provenance must match the retained released source.');
        }
        $manifest = json_decode($provenance, true, flags: JSON_THROW_ON_ERROR);
        $fixture = $manifest['fixtures']['mathml-se'] ?? null;
        $pdf = $this->bytes('mathml-se.pdf');
        $source = $this->bytes('mathml-se.tex');
        foreach (['pdf' => $pdf, 'source' => $source] as $kind => $bytes) {
            if (!is_array($fixture) || ($fixture[$kind]['bytes'] ?? null) !== strlen($bytes) || !hash_equals($fixture[$kind]['sha256'] ?? '', hash('sha256', $bytes))) {
                throw new \RuntimeException('The LaTeX fixture bytes must match their retained provenance.');
            }
        }
        return new LatexMathMlFixture($pdf, $source, $provenance);
    }

    private function bytes(string $name): string
    {
        $path = $this->directory . '/' . $name;
        $size = is_file($path) ? filesize($path) : false;
        if ($size === false || $size > 1024 * 1024) {
            throw new \RuntimeException('A retained LaTeX fixture is missing or exceeds 1 MiB.');
        }
        $bytes = file_get_contents($path);
        return $bytes === false ? throw new \RuntimeException('Cannot read the retained LaTeX fixture.') : $bytes;
    }
}
