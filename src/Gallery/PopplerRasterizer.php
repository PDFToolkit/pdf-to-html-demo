<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

use PDF\Html\Model\ImageContent;
use PDF\Html\Rendering\GraphicsRasterizer;
use PDF\Html\Rendering\RenderingDocument;

/** Explicit local build capability. Never used by the browser upload profile. */
final readonly class PopplerRasterizer implements GraphicsRasterizer
{
    public function __construct(private string $binary = 'pdftoppm', private ProcessRunner $processes = new ProcessRunner())
    {
    }

    public function version(): string
    {
        return trim($this->processes->run([$this->binary, '-v']));
    }

    public function rasterize(RenderingDocument $document): ImageContent
    {
        return new ImageContent($this->page($document->bytes)['bytes'], 'image/png', $document->widthPoints, $document->heightPoints, $document->sourcePage);
    }

    /** The authored gallery cases and retained signature fixture each have one page. @return array{bytes:string,width:int,height:int} */
    public function page(string $pdf): array
    {
        if (strlen($pdf) > 16 * 1024 * 1024) {
            throw new \InvalidArgumentException('Gallery rendering is limited to 16 MiB PDFs.');
        }
        $directory = sys_get_temp_dir() . '/pdftoolkit-gallery-' . bin2hex(random_bytes(12));
        if (!mkdir($directory, 0700)) {
            throw new \RuntimeException('Cannot create the build renderer directory.');
        }
        try {
            if (file_put_contents($directory . '/source.pdf', $pdf) !== strlen($pdf)) {
                throw new \RuntimeException('Cannot write the isolated rendering input.');
            }
            $this->processes->run([$this->binary, '-f', '1', '-l', '1', '-singlefile', '-r', '96', '-scale-to', '1600', '-png', $directory . '/source.pdf', $directory . '/page']);
            $path = $directory . '/page.png';
            $size = is_file($path) ? filesize($path) : false;
            $dimensions = is_file($path) ? getimagesize($path) : false;
            if ($size === false || $size > 16 * 1024 * 1024 || $dimensions === false || $dimensions[0] > 1600 || $dimensions[1] > 1600) {
                throw new \RuntimeException('Poppler did not produce a bounded PNG.');
            }
            $bytes = file_get_contents($path);
            if ($bytes === false) {
                throw new \RuntimeException('Cannot read the rendered PNG.');
            }
            return ['bytes' => $bytes, 'width' => $dimensions[0], 'height' => $dimensions[1]];
        } finally {
            foreach (['source.pdf', 'page.png'] as $filename) {
                if (is_file($directory . '/' . $filename)) {
                    unlink($directory . '/' . $filename);
                }
            }
            rmdir($directory);
        }
    }
}
