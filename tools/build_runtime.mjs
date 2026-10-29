import { build } from 'esbuild';
import { zipSync } from 'fflate';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node tools/build_runtime.mjs --output DIST');
const output = path.resolve(args[1]);
const assets = path.join(output, 'assets');
await fs.mkdir(assets, { recursive: true });
const lock = JSON.parse(await fs.readFile(path.join(root, 'composer.lock'), 'utf8'));
const expectedReferences = {
    'pdftoolkit/pdf-codecs': '1f82ae19d6dd874c574a5601d37f3ac63e0d4170',
    'pdftoolkit/pdf-to-html': 'af80339e9199f80f07c22a27b24aece6acb07fa9',
    'pdftoolkit/pdf-reader': '8f0a1a447da7812f515ac9c307f8431531d29655',
    'roukmoute/pdf': 'ea9ae2c134bbaf5fc3a22dbc7c81ff8e7b29a6cc',
};
const installed = JSON.parse(await fs.readFile(path.join(root, 'vendor/composer/installed.json'), 'utf8'));
if (installed.dev || installed.packages.length !== 4 || lock.packages.length !== 4 || lock['packages-dev'].length) {
    throw new Error('Install exactly the production Composer dependencies with --no-dev.');
}
for (const pkg of lock.packages) {
    if (pkg.source.reference !== expectedReferences[pkg.name] || pkg.dist.reference !== expectedReferences[pkg.name] || pkg.version.includes('dev')) throw new Error('Unexpected Composer dependency.');
    const actual = installed.packages.find(item => item.name === pkg.name);
    if (!actual || actual.version !== pkg.version || actual.source.reference !== pkg.source.reference || actual.dist.reference !== pkg.dist.reference) throw new Error('Installed dependency does not match lock.');
}
const archiveFiles = {};
const archiveManifest = {};
const libraryNotices = [];
async function addFile(relative) {
    if (/(^|\/)(tests?|docs?|fixtures|node_modules)(\/|$)/i.test(relative) || /\.(pem|der|p12|pfx|key|pdf)$/i.test(relative)) throw new Error(`Forbidden application archive path: ${relative}`);
    const source = path.join(root, relative);
    const stat = await fs.lstat(source);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Not a regular application file: ${relative}`);
    const data = new Uint8Array(await fs.readFile(source));
    archiveFiles[relative] = [data, { mtime: new Date(1980, 0, 1, 0, 0, 0) }];
    archiveManifest[relative] = { bytes: data.byteLength, sha256: hash(data) };
}
async function addTree(relative) {
    for (const entry of (await fs.readdir(path.join(root, relative), { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        const child = path.posix.join(relative, entry.name);
        if (entry.isDirectory()) await addTree(child);
        else if (entry.name.endsWith('.php')) await addFile(child);
    }
}
await addTree('src/Conversion');
await addFile('bin/convert.php');
await addFile('vendor/autoload.php');
await addTree('vendor/composer');
await addFile('vendor/composer/installed.json');
await addFile('composer.json');
await addFile('composer.lock');
for (const pkg of lock.packages) {
    await addTree(`vendor/${pkg.name}/src`);
    await addFile(`vendor/${pkg.name}/composer.json`);
    const names = await fs.readdir(path.join(root, 'vendor', pkg.name));
    const licenses = names.filter(name => /^(?:licen[cs]e|notice)(?:\.|$)/i.test(name));
    if (!names.some(name => /^licen[cs]e(?:\.|$)/i.test(name))) throw new Error(`Missing license for ${pkg.name}`);
    for (const name of licenses) {
        const relative = `vendor/${pkg.name}/${name}`;
        await addFile(relative);
        libraryNotices.push(relative);
    }
    if (pkg.name === 'pdftoolkit/pdf-codecs') {
        for (const codec of ['arithmetic', 'jpeg', 'jpeg2000', 'jbig2']) {
            const relative = `vendor/${pkg.name}/resources/${codec}`;
            const files = await fs.readdir(path.join(root, relative));
            if (!files.includes('NOTICE') || !files.includes('PDFJS-LICENSE') || !files.includes('provenance.json')) throw new Error(`Missing codec attribution: ${codec}`);
            for (const filename of files.sort()) {
                if (!/^(?:NOTICE|[A-Z]+-LICENSE|provenance\.json|upstream\.json)$/.test(filename)) throw new Error(`Unexpected codec attribution file: ${filename}`);
                const file = `${relative}/${filename}`;
                await addFile(file);
                libraryNotices.push(file);
            }
        }
    }
}
try { await addFile('LICENSE'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const runtime = path.join(assets, 'runtime');
await fs.rm(runtime, { recursive: true, force: true });
await fs.mkdir(runtime, { recursive: true });
const applicationZip = zipSync(archiveFiles, { level: 9 });
await fs.writeFile(path.join(runtime, 'application.zip.gz'), gzipSync(applicationZip, { level: 9 }));
await fs.writeFile(path.join(runtime, 'application-manifest.json'), JSON.stringify(archiveManifest, null, 2) + '\n');
await build({ entryPoints: [path.join(root, 'tools/conversion-worker-source.js')], outfile: path.join(assets, 'conversion-worker.js'), bundle: true, format: 'esm', platform: 'browser', external: ['worker_threads'], minify: true, legalComments: 'external' });
await build({ stdin: { contents: "export { zipSync, strToU8 } from 'fflate';", resolveDir: root, sourcefile: 'fflate-export.js' }, outfile: path.join(assets, 'fflate.js'), bundle: true, format: 'esm', platform: 'browser', minify: true, legalComments: 'external' });
const manifest = {
    schema: 1, php: '8.3.33', phpIntegerBytes: 8,
    maximumInputBytes: 8 * 1024 * 1024, maximumDurationMs: 30000, phpMemoryLimitBytes: 128 * 1024 * 1024,
    packages: lock.packages.map(pkg => ({ name: pkg.name, version: pkg.version, source: pkg.source, dist: pkg.dist })),
    npm: {}, application: 'runtime/application.zip.gz', applicationFileCount: Object.keys(archiveFiles).length,
    runtimes: {}, files: {},
};
const recorded = [];
async function record(relative) {
    const data = await fs.readFile(path.join(assets, relative));
    manifest.files[relative] = { bytes: data.byteLength, sha256: hash(data) };
    recorded.push(relative);
}
for (const variant of ['jspi', 'asyncify']) {
    const source = path.join(root, 'node_modules/@php-wasm/web-8-3', variant);
    const target = path.join(runtime, variant);
    await fs.mkdir(path.join(target, '8_3_33'), { recursive: true });
    for (const filename of ['php_8_3.js', '8_3_33/php_8_3.wasm']) {
        const data = await fs.readFile(path.join(source, filename));
        const compressed = filename.endsWith('.wasm');
        const outputName = filename + (compressed ? '.gz' : '');
        await fs.writeFile(path.join(target, outputName), compressed ? gzipSync(data, { level: 9 }) : data);
        await record(`runtime/${variant}/${outputName}`);
        if (compressed) Object.assign(manifest.files[`runtime/${variant}/${outputName}`], { compression: 'gzip', decodedBytes: data.byteLength, decodedSha256: hash(data) });
    }
    manifest.runtimes[variant] = { loader: `runtime/${variant}/php_8_3.js`, wasm: `runtime/${variant}/8_3_33/php_8_3.wasm.gz` };
}
const licenses = path.join(runtime, 'licenses');
await fs.mkdir(licenses, { recursive: true });
for (const relative of libraryNotices) {
    const filename = relative.replaceAll('/', '_');
    await fs.copyFile(path.join(root, relative), path.join(licenses, filename));
    await record(`runtime/licenses/${filename}`);
}
const npmLock = JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8'));
for (const [location, pkg] of Object.entries(npmLock.packages)) {
    if (!location || pkg.dev || pkg.optional && location.startsWith('node_modules/@esbuild/')) continue;
    const name = location.replace(/^node_modules\//, '');
    manifest.npm[name] = { version: pkg.version, integrity: pkg.integrity };
    const directory = path.join(root, location);
    for (const filename of (await fs.readdir(directory)).filter(name => /^licen[cs]e(?:\.|$)/i.test(name))) {
        const target = name.replaceAll('/', '_') + '-' + filename;
        await fs.copyFile(path.join(directory, filename), path.join(licenses, target));
        await record(`runtime/licenses/${target}`);
    }
}
const notices = 'PHP.wasm source and corresponding version: https://github.com/WordPress/wordpress-playground/tree/1e779217fceedb5b29b1359a196dc97ce40f31de\nPHP runtime build: @php-wasm/web-8-3 3.1.61 (PHP 8.3.33), GPL-2.0-or-later.\nPDFToolkit packages and references are recorded in ../application-manifest.json and ../../runtime-manifest.json.\n';
await fs.writeFile(path.join(licenses, 'SOURCES.txt'), notices);
await record('runtime/licenses/SOURCES.txt');
for (const filename of ['runtime/application.zip.gz', 'runtime/application-manifest.json', 'conversion-worker.js', 'fflate.js']) await record(filename);
for (const filename of ['conversion-worker.js.LEGAL.txt', 'fflate.js.LEGAL.txt']) {
    try { await record(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
Object.assign(manifest.files['runtime/application.zip.gz'], { compression: 'gzip', decodedBytes: applicationZip.byteLength, decodedSha256: hash(applicationZip) });
await fs.writeFile(path.join(assets, 'runtime-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output, php: manifest.php, files: recorded.length, applicationFiles: manifest.applicationFileCount, applicationZipBytes: manifest.files['runtime/application.zip.gz'].bytes, totalBytes: Object.values(manifest.files).reduce((sum, item) => sum + item.bytes, 0) }));

function hash(data) { return createHash('sha256').update(data).digest('hex'); }
