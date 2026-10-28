<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use PDFToolkit\Demo\Conversion\Bridge;
use PDFToolkit\Demo\Conversion\ConversionInput;

final class ConversionChecks
{
    private int $checks = 0;
    private string $directory;

    public function run(): void
    {
        $this->directory = sys_get_temp_dir() . '/pdftoolkit-demo-' . bin2hex(random_bytes(8));
        mkdir($this->directory);
        try {
            $pdf = file_get_contents(__DIR__ . '/Fixtures/tagged.pdf');
            $output = $this->convert($pdf, 'tagged.pdf');
            $this->same(true, $output['ok']);
            $this->same('05ce206b7c078c22686a07b26d2dd88da792318a045b2862c2a7208c747ff19b', hash('sha256', $output['result']['html']));
            $this->same(false, str_contains($output['result']['html'], '<script'));
            $this->same(1, count($output['result']['assets']));
            $this->same('image/png', $output['result']['assets'][0]['mediaType']);
            $this->same('b1ff9c8ea3a780bad09b346c423d2d0e46815926879b18e841d928376a946640', hash('sha256', base64_decode($output['result']['assets'][0]['base64'], true)));
            $this->same('scripts-disabled', $output['result']['diagnostics'][0]['code']);
            $this->error('', 'empty.pdf', 'file_size');
            $this->error('This is not a PDF', 'text.pdf', 'invalid_pdf');
            $this->error("%PDF-1.7\ninvalid", 'invalid.pdf', 'invalid_pdf');
            $this->error("%PDF-9.9\n", 'future.pdf', 'unsupported_pdf');
            $this->error($pdf, '../invalid.pdf', 'invalid_request');
            $this->error($pdf, "invalid\0.pdf", 'invalid_request');
            $this->error($this->untagged(), 'untagged.pdf', 'untagged_pdf');
            $this->error(file_get_contents(__DIR__ . '/Fixtures/encrypted.pdf'), 'encrypted.pdf', 'encrypted_pdf');
            $this->error('%PDF-' . str_repeat(' ', ConversionInput::MAXIMUM_BYTES), 'large.pdf', 'file_size');
            file_put_contents($this->directory . '/request.json', '{invalid');
            $invalidRequest = json_decode((new Bridge())->run($this->directory . '/input.pdf', $this->directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
            $this->same('invalid_request', $invalidRequest['error']['code']);
            file_put_contents($this->directory . '/request.json', '{"filename":"remote.pdf"}');
            $remote = json_decode((new Bridge())->run('https://example.invalid/private.pdf', $this->directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
            $this->same('invalid_request', $remote['error']['code']);
            echo json_encode(['passed' => true, 'php' => PHP_VERSION, 'checks' => $this->checks], JSON_THROW_ON_ERROR) . "\n";
        } finally {
            foreach (glob($this->directory . '/*') as $path) unlink($path);
            rmdir($this->directory);
        }
    }

    private function convert(string $bytes, string $name): array
    {
        file_put_contents($this->directory . '/input.pdf', $bytes);
        file_put_contents($this->directory . '/request.json', json_encode(['filename' => $name], JSON_THROW_ON_ERROR));
        return json_decode((new Bridge())->run($this->directory . '/input.pdf', $this->directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
    }

    private function error(string $bytes, string $name, string $code): void
    {
        $output = $this->convert($bytes, $name);
        $this->same(false, $output['ok']);
        $this->same($code, $output['error']['code']);
    }

    private function same(mixed $expected, mixed $actual): void
    {
        if ($expected !== $actual) throw new RuntimeException('Unexpected result: ' . json_encode([$expected, $actual]));
        ++$this->checks;
    }

    private function untagged(): string
    {
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>', "<< /Length 0 >>\nstream\n\nendstream"];
        $bytes = "%PDF-1.7\n"; $offsets = [];
        foreach ($objects as $index => $object) { $offsets[] = strlen($bytes); $bytes .= ($index + 1) . " 0 obj\n" . $object . "\nendobj\n"; }
        $xref = strlen($bytes); $bytes .= "xref\n0 5\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $bytes .= sprintf("%010d 00000 n \n", $offset);
        return $bytes . "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n" . $xref . "\n%%EOF\n";
    }
}

(new ConversionChecks())->run();
