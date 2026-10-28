<?php

declare(strict_types=1);

namespace PDFToolkit\Demo\Gallery;

/** Bounded build-time execution; argument arrays never pass through a shell. */
final readonly class ProcessRunner
{
    /** @param non-empty-list<string> $command */
    public function run(array $command, ?string $directory = null, int $timeoutSeconds = 30): string
    {
        $process = proc_open($command, [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, $directory);
        if (!is_resource($process)) {
            throw new \RuntimeException('Cannot start the explicitly selected build tool.');
        }
        fclose($pipes[0]);
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $output = $error = '';
        $started = hrtime(true);
        $exit = -1;
        try {
            do {
                $output .= stream_get_contents($pipes[1]);
                $error .= stream_get_contents($pipes[2]);
                if (strlen($output) + strlen($error) > 1024 * 1024) {
                    throw new \RuntimeException('The build tool exceeded its output limit.');
                }
                $status = proc_get_status($process);
                if (!$status['running']) {
                    $exit = $status['exitcode'];
                    $output .= stream_get_contents($pipes[1]);
                    $error .= stream_get_contents($pipes[2]);
                    break;
                }
                if (hrtime(true) - $started > $timeoutSeconds * 1_000_000_000) {
                    throw new \RuntimeException('The build tool exceeded its time limit.');
                }
                usleep(10_000);
            } while (true);
        } finally {
            $status = proc_get_status($process);
            if ($status['running']) {
                proc_terminate($process, 9);
            }
            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($process);
        }
        if ($exit !== 0) {
            throw new \RuntimeException('Build tool failed: ' . trim($error . "\n" . $output));
        }
        return $output === '' ? $error : $output;
    }
}
