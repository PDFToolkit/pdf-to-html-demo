import { PHP, loadPHPRuntime } from '@php-wasm/universal';
import { jspi } from 'wasm-feature-detect';

/** One isolated PHP instance and virtual filesystem per worker/job. */
class ConversionWorker {
    #started = false;
    #id = '';

    async accept(message) {
        if (this.#started) return;
        this.#started = true;
        this.#id = typeof message?.id === 'string' ? message.id.slice(0, 80) : '';
        const startedAt = performance.now();
        try {
            if (message?.type !== 'convert' || !this.#id || !(message.input instanceof ArrayBuffer) || typeof message.filename !== 'string') {
                this.#fail('invalid_request', 'Supply a PDF file and a conversion identifier.');
                return;
            }
            if (message.input.byteLength === 0 || message.input.byteLength > 8 * 1024 * 1024) {
                this.#fail('file_size', 'Choose a nonempty PDF of at most 8 MiB.');
                return;
            }
            if (message.filename.length === 0 || new TextEncoder().encode(message.filename).length > 255 || /[\x00-\x1f\x7f/\\]/.test(message.filename)) {
                this.#fail('invalid_request', 'Supply a PDF filename without path separators or control characters.');
                return;
            }
            this.#progress('loading-runtime');
            const manifestResponse = await fetch(new URL('./runtime-manifest.json', import.meta.url), { credentials: 'omit', redirect: 'error' });
            if (!manifestResponse.ok) throw new Error('The runtime manifest could not be loaded.');
            const manifest = await manifestResponse.json();
            const variant = await jspi() ? 'jspi' : 'asyncify';
            const runtime = manifest.runtimes[variant];
            const loaderBytes = await this.#download(runtime.loader, manifest.files[runtime.loader]);
            // A blob module has no relative URL base. Preserve the verified loader's
            // original module URL while executing its bytes without another fetch.
            const loaderSource = new TextDecoder('utf-8', { fatal: true }).decode(loaderBytes)
                .replaceAll('import.meta.url', JSON.stringify(this.#assetUrl(runtime.loader).href));
            const moduleUrl = URL.createObjectURL(new Blob([loaderSource], { type: 'text/javascript' }));
            let loader;
            try {
                loader = await import(moduleUrl);
            } finally {
                URL.revokeObjectURL(moduleUrl);
            }
            const wasmBinary = await this.#download(runtime.wasm, manifest.files[runtime.wasm]);
            const php = new PHP(await loadPHPRuntime(loader, { wasmBinary }));
            const runtimeProbe = await php.run({ code: "<?php echo json_encode(['phpVersion'=>PHP_VERSION,'phpIntSize'=>PHP_INT_SIZE,'extensions'=>get_loaded_extensions()]);" });
            if (runtimeProbe.exitCode !== 0) throw new Error('The PHP runtime could not start.');
            const runtimeInfo = JSON.parse(runtimeProbe.text);
            if (runtimeInfo.phpIntSize !== 8 || !['dom', 'mbstring', 'zlib', 'zip'].every(name => runtimeInfo.extensions.includes(name))) {
                this.#fail('runtime_unavailable', 'The browser runtime does not meet the converter requirements.');
                return;
            }
            this.#progress('loading-library');
            const application = await this.#download(manifest.application, manifest.files[manifest.application]);
            php.mkdir('/app');
            php.writeFile('/app/application.zip', application);
            const extracted = await php.run({ code: "<?php $zip = new ZipArchive(); if ($zip->open('/app/application.zip') !== true || !$zip->extractTo('/app')) throw new RuntimeException('Application archive could not be opened'); $zip->close(); unlink('/app/application.zip');" });
            if (extracted.exitCode !== 0) throw new Error('The converter could not be loaded.');
            php.mkdir('/job');
            php.writeFile('/job/input.pdf', new Uint8Array(message.input));
            php.writeFile('/job/request.json', JSON.stringify({ filename: message.filename }));
            this.#progress('converting');
            const response = await php.run({ scriptPath: '/app/bin/convert.php' });
            if (response.exitCode !== 0) {
                this.#fail('resource_limit', 'Conversion stopped because the document exceeded a runtime limit. Try a smaller or simpler PDF.');
                return;
            }
            const payload = JSON.parse(response.text);
            if (payload.ok !== true) {
                this.#fail(payload.error?.code ?? 'conversion_failed', payload.error?.message ?? 'This PDF could not be converted.');
                return;
            }
            self.postMessage({
                type: 'result', id: this.#id, result: payload.result,
                meta: { phpVersion: runtimeInfo.phpVersion, phpIntSize: runtimeInfo.phpIntSize, variant, durationMs: Math.round(performance.now() - startedAt) },
            });
        } catch {
            this.#fail('runtime_unavailable', 'The local converter could not start or finish. Reload the page and try again.');
        } finally {
            // The UI also terminates the worker on completion, cancellation, or its 30 s deadline.
            self.close();
        }
    }

    async #download(path, expected) {
        if (!expected || !/^[a-f0-9]{64}$/.test(expected.sha256)) throw new Error('Missing asset integrity.');
        const url = this.#assetUrl(path);
        const response = await fetch(url, { credentials: 'omit', redirect: 'error' });
        if (!response.ok) throw new Error('Runtime asset could not be loaded.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
        if (bytes.byteLength !== expected.bytes || hash !== expected.sha256) throw new Error('Runtime integrity mismatch.');
        if (expected.compression === 'gzip') {
            const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
            const decoded = new Uint8Array(await new Response(stream).arrayBuffer());
            if (decoded.byteLength !== expected.decodedBytes) throw new Error('Decoded runtime size mismatch.');
            return decoded;
        }
        return bytes;
    }

    #assetUrl(path) {
        if (typeof path !== 'string' || !/^runtime\/[A-Za-z0-9_./-]+$/.test(path) || path.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error('Invalid local runtime asset path.');
        const url = new URL(path, import.meta.url);
        if (url.origin !== self.location.origin) throw new Error('Runtime assets must be same-origin.');
        return url;
    }

    #progress(stage) {
        self.postMessage({ type: 'progress', id: this.#id, stage });
    }

    #fail(code, message) {
        self.postMessage({ type: 'error', id: this.#id, error: { code, message } });
    }
}

const conversion = new ConversionWorker();
self.onmessage = event => conversion.accept(event.data);
