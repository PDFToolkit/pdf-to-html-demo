<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use PDFToolkit\Demo\Conversion\ConversionInput;
use PDFToolkit\Demo\Inspection\Bridge;
use PDFToolkit\Demo\Inspection\Inspector;

final class InspectionChecks
{
    private int $checks = 0;

    public function run(): void
    {
        $bytes = file_get_contents(__DIR__ . '/Fixtures/tagged.pdf');
        $sourceHash = hash('sha256', $bytes);
        $inspector = new Inspector();
        $result = json_decode(json_encode($inspector->inspect(new ConversionInput($bytes, 'private-name.pdf')), JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
        $this->check($result['source'] === ['sha256' => $sourceHash, 'bytes' => strlen($bytes)], 'exact original source identity');
        $this->check($result['inspection']['schemaVersion'] === 1 && $result['inspection']['document']['tagged'], 'tagged snapshot schema');
        $this->check(count($result['inspection']['nodes']) > 0 && count($result['inspection']['pages']) === 1, 'real tree and page');
        $this->check(!$result['inspection']['truncated'], 'ordinary fixture fits budgets');
        $this->check(!str_contains(json_encode($result), 'private-name.pdf'), 'input filename is not serialized');
        $this->check(hash('sha256', $bytes) === $sourceHash, 'input stays unchanged');
        $again = json_decode(json_encode($inspector->inspect(new ConversionInput($bytes, 'other-name.pdf')), JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
        $this->check($again === $result, 'fresh inspection session yields deterministic snapshot');

        $directory = sys_get_temp_dir() . '/pdftoolkit-inspection-' . bin2hex(random_bytes(8));
        mkdir($directory);
        try {
            file_put_contents($directory . '/input.pdf', $bytes);
            file_put_contents($directory . '/request.json', '{"filename":"local.pdf"}');
            $bridge = new Bridge();
            $success = json_decode($bridge->run($directory . '/input.pdf', $directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
            $this->check($success === ['ok' => true, 'result' => $result], 'CLI bridge matches native API');
            $bad = json_decode($bridge->run('https://example.invalid/private.pdf', $directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
            $this->check($bad['error']['code'] === 'invalid_request', 'no implicit remote input');
            file_put_contents($directory . '/request.json', '{"filename":"../private.pdf"}');
            $bad = json_decode($bridge->run($directory . '/input.pdf', $directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
            $this->check($bad['error']['code'] === 'invalid_request', 'filename path rejected');
            file_put_contents($directory . '/request.json', '{');
            $bad = json_decode($bridge->run($directory . '/input.pdf', $directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
            $this->check($bad['error']['code'] === 'invalid_request', 'bad request remains bounded error');
            file_put_contents($directory . '/request.json', '{"filename":"encrypted.pdf"}');
            file_put_contents($directory . '/input.pdf', file_get_contents(__DIR__ . '/Fixtures/encrypted.pdf'));
            $bad = json_decode($bridge->run($directory . '/input.pdf', $directory . '/request.json'), true, flags: JSON_THROW_ON_ERROR);
            $this->check($bad['error']['code'] === 'encrypted_pdf', 'authentication remains explicit');
        } finally {
            foreach (glob($directory . '/*') as $path) unlink($path);
            rmdir($directory);
        }

        echo json_encode(['passed' => true, 'php' => PHP_VERSION, 'checks' => $this->checks], JSON_THROW_ON_ERROR) . "\n";
    }

    private function check(bool $condition, string $name): void
    {
        if (!$condition) throw new RuntimeException($name);
        ++$this->checks;
    }
}

(new InspectionChecks())->run();
