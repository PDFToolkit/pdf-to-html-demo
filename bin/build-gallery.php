<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use PDFToolkit\Demo\Gallery\GalleryBuilder;
use PDFToolkit\Demo\Gallery\PopplerRasterizer;

$options = getopt('', ['output:', 'html-source:', 'pdftoppm:', 'revision:', 'version:', 'draft']);
if ($options === false || !isset($options['output']) || !is_string($options['output'])) {
    throw new InvalidArgumentException('Usage: php bin/build-gallery.php --output dist/gallery --html-source ../pdf-to-html [--revision SHA | --draft] [--version 0.1.0] [--pdftoppm /path/to/pdftoppm]');
}
foreach (['html-source', 'pdftoppm', 'revision', 'version'] as $name) {
    if (isset($options[$name]) && !is_string($options[$name])) {
        throw new InvalidArgumentException('Each build option must occur once with a string value.');
    }
}
$builder = new GalleryBuilder(dirname(__DIR__), new PopplerRasterizer($options['pdftoppm'] ?? 'pdftoppm'));
$manifest = $builder->build($options['output'], $options['revision'] ?? null, $options['version'] ?? '0.1.0', $options['html-source'] ?? null, array_key_exists('draft', $options));
echo json_encode(['manifest' => $options['output'] . '/gallery-manifest.json', 'draft' => $manifest['draft'], 'generator' => $manifest['generator'], 'cases' => count($manifest['cases']), 'assets' => count($manifest['assets'])], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
