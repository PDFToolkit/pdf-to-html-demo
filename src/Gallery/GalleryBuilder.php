<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

use Composer\InstalledVersions;
use PDF\Html\DerivationResult;

/** Filesystem operations belong to this reproducible build application. */
final readonly class GalleryBuilder
{
    public const HTML_REVISION = 'ca0e6da0c28cd79933c9006bbf4b9d942d933e78';
    private const SIGNATURE_SHA = '8b55dfe5e157d024d88703c4cd761f0bb77dfd94178536d5f6f06ea09f1bd10e';
    private const CERTIFICATE_SHA = '61ecaec8b4fc69746718148aedaec21ee853c583a8e5e05967dd494dc54ed1d6';

    public function __construct(private string $root, private PopplerRasterizer $rasterizer = new PopplerRasterizer(), private ProcessRunner $processes = new ProcessRunner())
    {
    }

    /** @return array<string,mixed> */
    public function build(string $output, ?string $revision, string $version = '0.1.0', ?string $htmlSource = null, bool $draft = false): array
    {
        if (InstalledVersions::getReference('pdftoolkit/pdf-to-html') !== self::HTML_REVISION || ltrim(InstalledVersions::getPrettyVersion('pdftoolkit/pdf-to-html') ?? '', 'v') !== '0.6.0') {
            throw new \RuntimeException('Build the gallery with the exact released HTML 0.6.0 dependency.');
        }
        if (preg_match('/^\d+\.\d+\.\d+$/D', $version) !== 1) {
            throw new \InvalidArgumentException('The gallery version must be an explicit stable version.');
        }
        if (!$draft) {
            $head = trim($this->processes->run(['git', 'rev-parse', '--verify', 'HEAD'], $this->root));
            $revision ??= $head;
            if (preg_match('/^[a-f0-9]{40}$/D', $revision) !== 1 || $head !== $revision || trim($this->processes->run(['git', 'status', '--porcelain'], $this->root)) !== '') {
                throw new \RuntimeException('A release gallery requires its exact clean Git HEAD. Use --draft for review output.');
            }
        } elseif ($revision !== null) {
            throw new \InvalidArgumentException('A draft deliberately has no claimed generator commit.');
        }
        [$signature, $certificate] = $this->signature($htmlSource);
        $cases = (new CaseFactory())->all($signature, $certificate);
        if (!$draft && count($cases) !== 7) {
            throw new \RuntimeException('A release gallery requires the published signature fixture via --html-source.');
        }
        $generator = ['package' => 'pdftoolkit/pdf-to-html-demo', 'version' => $version, 'commit' => $revision];
        $output = $this->outputPath($output);
        $stage = $output . '.building-' . bin2hex(random_bytes(8));
        if (!mkdir($stage, 0755)) {
            throw new \RuntimeException('Cannot create the gallery build directory.');
        }
        try {
            $items = $inventory = [];
            $conversion = new GalleryConversion($this->rasterizer);
            foreach ($cases as $case) {
                $result = $conversion->convert($case);
                $this->assertOutput($case, $result);
                $preview = $this->rasterizer->page($case->pdf);
                $pdf = $this->write($stage, $case->id . '/source.pdf', $case->pdf, 'application/pdf', $inventory);
                $html = $this->write($stage, $case->id . '/result.html.txt', $result->html, 'text/plain', $inventory);
                $png = $this->write($stage, $case->id . '/page-1.png', $preview['bytes'], 'image/png', $inventory);
                $code = $this->write($stage, $case->id . '/example.php.txt', $this->read($this->root . '/src/Gallery/CaseFactory.php'), 'text/plain', $inventory);
                $assets = [];
                foreach ($result->assets as $asset) {
                    $assets[] = $this->write($stage, $case->id . '/' . $asset->filename, $asset->bytes, $asset->mediaType, $inventory);
                }
                $diagnostics = $this->write($stage, $case->id . '/diagnostics.json', $this->json(['profile' => $case->profile, 'sourceSha256' => $pdf['sha256'], 'htmlSha256' => $html['sha256'], 'diagnostics' => $result->diagnostics]), 'application/json', $inventory);
                $files = ['pdf' => $pdf, 'html' => $html, 'preview' => $png, 'code' => $code, 'diagnostics' => $diagnostics, 'assets' => $assets];
                if ($case->certificate !== null) {
                    $files['certificate'] = $this->write($stage, $case->id . '/signer.der', $case->certificate, 'application/pkix-cert', $inventory);
                }
                $source = $case->fixturePath === null
                    ? ['kind' => 'generated', ...$generator, 'path' => 'src/Gallery/CaseFactory.php']
                    : ['kind' => 'published-fixture', 'package' => 'pdftoolkit/pdf-to-html', 'version' => '0.6.0', 'commit' => self::HTML_REVISION, 'path' => $case->fixturePath];
                $items[] = ['id' => $case->id, 'title' => $case->title, 'description' => $case->description, 'observations' => $case->observations, 'profile' => $case->profile, 'capabilities' => $case->capabilities, 'source' => $source, 'files' => $files, 'pages' => [[...$png, 'width' => $preview['width'], 'height' => $preview['height']]], 'expected' => $case->expected];
            }
            // The per-case source excerpt is the actual factory. Include its full object/build context once.
            $sources = glob($this->root . '/src/Gallery/*.php') ?: [];
            $sources[] = $this->root . '/bin/build-gallery.php';
            sort($sources);
            foreach ($sources as $path) {
                $relative = substr($path, strlen($this->root) + 1);
                $this->write($stage, 'source/' . $relative . '.txt', $this->read($path), 'text/plain', $inventory);
            }
            usort($inventory, static fn (array $a, array $b): int => $a['path'] <=> $b['path']);
            $manifest = ['schemaVersion' => 1, 'draft' => $draft, 'generator' => $generator, 'htmlPackage' => ['version' => '0.6.0', 'revision' => self::HTML_REVISION], 'rendering' => ['engine' => 'Poppler pdftoppm', 'version' => $this->rasterizer->version(), 'maximumDimension' => 1600], 'cases' => $items, 'assets' => $inventory];
            if (file_put_contents($stage . '/gallery-manifest.json', $this->json($manifest)) === false) {
                throw new \RuntimeException('Cannot write the gallery manifest.');
            }
            $this->publishDirectory($stage, $output);
            return $manifest;
        } finally {
            if (is_dir($stage)) {
                $this->removeBuildDirectory($stage);
            }
        }
    }

    /** @return array{?string,?string} */
    private function signature(?string $source): array
    {
        if ($source === null) {
            return [null, null];
        }
        $root = realpath($source);
        if ($root === false) {
            throw new \InvalidArgumentException('--html-source must identify the checked-out HTML 0.6.0 source.');
        }
        $pdf = $this->read($root . '/tests/Fixtures/signatures/signed-padded.pdf');
        $certificate = $this->read($root . '/tests/Fixtures/signatures/signer.der');
        if (!hash_equals(self::SIGNATURE_SHA, hash('sha256', $pdf)) || !hash_equals(self::CERTIFICATE_SHA, hash('sha256', $certificate))) {
            throw new \RuntimeException('The signature PDF and public certificate must match the published 0.6.0 fixture.');
        }
        return [$pdf, $certificate];
    }

    private function assertOutput(GalleryCase $case, DerivationResult $result): void
    {
        foreach ($case->expected['tags'] ?? [] as $tag) {
            if (preg_match('/<' . preg_quote($tag, '/') . '(?:\s|>)/i', $result->html) !== 1) {
                throw new \RuntimeException($case->id . ': the expected derived ' . $tag . ' element is missing.');
            }
        }
        if (($case->expected['scripts'] ?? null) === false && stripos($result->html, '<script') !== false) {
            throw new \RuntimeException('The passive case unexpectedly emitted a script.');
        }
        if ($case->profile === 'signature' && !str_contains($result->html, 'data-pdf-signature-status="integrity-verified"')) {
            throw new \RuntimeException('The published signature fixture did not verify against its explicit test certificate.');
        }
        if ($case->profile === 'reset') {
            $scripts = array_filter($result->assets, static fn ($asset): bool => $asset->mediaType === 'text/javascript');
            if (count($scripts) !== 1 || !str_contains($result->html, 'data-pdf-form-action="ResetForm"')) {
                throw new \RuntimeException('The reset case requires exactly its library-owned script asset.');
            }
        }
    }

    private function outputPath(string $path): string
    {
        if ($path === '' || preg_match('/^[A-Za-z][A-Za-z0-9+.-]*:/', $path) === 1 || in_array(basename($path), ['.', '..'], true) || is_link($path)) {
            throw new \InvalidArgumentException('Choose an explicit local gallery directory.');
        }
        $parent = dirname($path);
        if (!is_dir($parent) && !mkdir($parent, 0755, true)) {
            throw new \RuntimeException('Cannot create the gallery parent directory.');
        }
        $realParent = realpath($parent);
        if ($realParent === false) {
            throw new \RuntimeException('Cannot resolve the gallery parent directory.');
        }
        return $realParent . '/' . basename($path);
    }

    /** @param list<array<string,mixed>> $inventory @return array{path:string,bytes:int,sha256:string,mediaType:string} */
    private function write(string $root, string $relative, string $bytes, string $mediaType, array &$inventory): array
    {
        if (preg_match('~\A[a-zA-Z0-9_.-]+(?:/[a-zA-Z0-9_.-]+)*\z~D', $relative) !== 1 || str_contains($relative, '..')) {
            throw new \LogicException('A gallery artifact needs a safe relative path.');
        }
        $path = $root . '/' . $relative;
        if (!is_dir(dirname($path)) && !mkdir(dirname($path), 0755, true)) {
            throw new \RuntimeException('Cannot create an artifact directory.');
        }
        if (is_file($path) || file_put_contents($path, $bytes) !== strlen($bytes)) {
            throw new \RuntimeException('An artifact collided or could not be written.');
        }
        $entry = ['path' => $relative, 'bytes' => strlen($bytes), 'sha256' => hash('sha256', $bytes), 'mediaType' => $mediaType];
        $inventory[] = $entry;
        return $entry;
    }

    private function read(string $path): string
    {
        $size = is_file($path) ? filesize($path) : false;
        if ($size === false || $size > 16 * 1024 * 1024) {
            throw new \RuntimeException('A gallery input is missing or exceeds 16 MiB.');
        }
        $bytes = file_get_contents($path);
        return $bytes === false ? throw new \RuntimeException('Cannot read the gallery input.') : $bytes;
    }

    /** @param array<string,mixed> $value */
    private function json(array $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    }

    private function publishDirectory(string $stage, string $output): void
    {
        $backup = null;
        if (is_dir($output)) {
            $files = iterator_to_array(new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($output, \FilesystemIterator::SKIP_DOTS)));
            if ($files !== []) {
                $manifest = json_decode($this->read($output . '/gallery-manifest.json'), true, flags: JSON_THROW_ON_ERROR);
                if (($manifest['generator']['package'] ?? null) !== 'pdftoolkit/pdf-to-html-demo') {
                    throw new \RuntimeException('Refusing to replace an unrelated output directory.');
                }
                $known = ['gallery-manifest.json' => null];
                foreach ($manifest['assets'] ?? [] as $asset) {
                    $known[$asset['path']] = $asset['sha256'];
                }
                foreach ($files as $file) {
                    $relative = substr($file->getPathname(), strlen($output) + 1);
                    if ($file->isLink() || !array_key_exists($relative, $known) || $known[$relative] !== null && !hash_equals($known[$relative], hash_file('sha256', $file->getPathname()))) {
                        throw new \RuntimeException('The old gallery contains an unrecorded or modified artifact. Choose a new output directory.');
                    }
                }
            }
            $backup = $output . '.previous-' . bin2hex(random_bytes(8));
            if (!rename($output, $backup)) {
                throw new \RuntimeException('Cannot preserve the previous gallery while replacing it.');
            }
        } elseif (file_exists($output)) {
            throw new \RuntimeException('The gallery output is not a directory.');
        }
        if (!rename($stage, $output)) {
            if ($backup !== null) {
                rename($backup, $output);
            }
            throw new \RuntimeException('Cannot install the completed gallery.');
        }
        if ($backup !== null) {
            $this->removeBuildDirectory($backup);
        }
    }

    private function removeBuildDirectory(string $directory): void
    {
        $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($files as $file) {
            $file->isDir() && !$file->isLink() ? rmdir($file->getPathname()) : unlink($file->getPathname());
        }
        rmdir($directory);
    }
}
