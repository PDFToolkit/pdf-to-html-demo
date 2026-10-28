<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

echo (new PDFToolkit\Demo\Conversion\Bridge())->run($argv[1] ?? '/job/input.pdf', $argv[2] ?? '/job/request.json');
