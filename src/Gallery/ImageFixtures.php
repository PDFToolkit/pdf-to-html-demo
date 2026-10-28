<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

/** Explicit build-time input reader; no filesystem access occurs in image conversion. */
final readonly class ImageFixtures
{
    public function __construct(private string $directory)
    {
    }

    /** @return list<ImageFixture> */
    public function read(): array
    {
        $manifest = json_decode($this->bytes('manifest.json'), true, flags: JSON_THROW_ON_ERROR);
        if (($manifest['schemaVersion'] ?? null) !== 1 || ($manifest['license'] ?? null) !== 'MIT' || count($manifest['cases'] ?? []) !== 3) {
            throw new \RuntimeException('The three original gallery image inputs require their provenance manifest.');
        }
        $result = [];
        foreach ($manifest['cases'] as $case) {
            if ($case['width'] !== 320 || $case['height'] !== 160 || ($case['maximumPixelError'] ?? -1) !== ($case['id'] === 'jpeg' ? 3 : 0)) {
                throw new \RuntimeException('Unexpected gallery image dimensions or pixel tolerance.');
            }
            $result[] = new ImageFixture($case['id'], $this->verified($case['encoded']), $this->verified($case['expected']), [
                'license' => $manifest['license'], 'artwork' => $manifest['artwork'], 'generator' => $manifest['generator'], 'tools' => $manifest['tools'], 'image' => $case,
            ]);
        }
        if (array_map(static fn (ImageFixture $fixture): string => $fixture->id, $result) !== ['jpeg', 'jpeg2000', 'jbig2']) {
            throw new \RuntimeException('Gallery image identities must be unique and complete.');
        }
        return $result;
    }

    /** @param array{path:string,bytes:int,sha256:string} $record */
    private function verified(array $record): string
    {
        $bytes = $this->bytes($record['path']);
        if (strlen($bytes) !== $record['bytes'] || !hash_equals($record['sha256'], hash('sha256', $bytes))) {
            throw new \RuntimeException('The gallery image differs from its retained provenance.');
        }
        return $bytes;
    }

    private function bytes(string $name): string
    {
        if (preg_match('/^[a-z0-9][a-z0-9.-]*$/D', $name) !== 1 || str_contains($name, '..')) {
            throw new \RuntimeException('An image fixture must be a local filename.');
        }
        $path = $this->directory . '/' . $name;
        if (!is_file($path) || is_link($path) || filesize($path) > 1024 * 1024) {
            throw new \RuntimeException('An image fixture is absent or exceeds its byte limit.');
        }
        return file_get_contents($path) ?: throw new \RuntimeException('An image fixture is empty or unreadable.');
    }
}
