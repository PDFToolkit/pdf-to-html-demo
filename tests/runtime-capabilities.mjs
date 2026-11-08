import assert from 'node:assert/strict';
import { RuntimeCapabilities, RuntimeCapabilityFailure } from '../tools/runtime-capabilities.js';

class RuntimeCapabilityChecks {
    constructor() {
        this.checks = [];
    }

    async check(name, callback) {
        await callback();
        this.checks.push(name);
    }

    async run() {
        await this.check('WebAssembly absence is explicit, not an Asyncify fallback', async () => {
            for (const unavailable of [null, {}, { instantiate: false }]) {
                await assert.rejects(new RuntimeCapabilities(unavailable).selectVariant(), error =>
                    error instanceof RuntimeCapabilityFailure && error.code === 'wasm_unavailable');
            }
        });
        await this.check('Blocked compilation fails without invoking JSPI', async () => {
            let probes = 0;
            const blocked = { instantiate: async () => { throw new Error('private browser policy'); },
                Suspending: class { constructor() { probes++; } }, promising() { probes++; } };
            await assert.rejects(new RuntimeCapabilities(blocked).selectVariant(), error =>
                error.code === 'wasm_unavailable' && !error.message.includes('private'));
            assert.equal(probes, 0);
        });
        await this.check('Present but incomplete JSPI APIs select Asyncify', async () => {
            for (const api of [
                {}, { Suspending: undefined }, { Suspending: class {} },
                { Suspending: {}, promising() {} }, { Suspending: class {}, promising: false },
            ]) {
                // The old name-only probe returns true for every Suspending key here.
                const runtime = { instantiate: WebAssembly.instantiate.bind(WebAssembly), ...api };
                assert.equal(await new RuntimeCapabilities(runtime).selectVariant(), 'asyncify');
            }
        });
        await this.check('A failing suspension or promise wrapper selects Asyncify', async () => {
            for (const fault of ['constructor', 'instantiate', 'wrapper', 'rejection', 'wrong-value', 'not-a-promise']) {
                let instantiations = 0;
                const runtime = {
                    Suspending: class { constructor() { if (fault === 'constructor') throw new Error('unsupported'); } },
                    instantiate: async () => {
                        if (++instantiations > 1 && fault === 'instantiate') throw new Error('unsupported');
                        return { instance: { exports: { run() {} } } };
                    },
                    promising() {
                        if (fault === 'wrapper') throw new Error('unsupported');
                        return () => fault === 'rejection' ? Promise.reject(new Error('unsupported'))
                            : fault === 'wrong-value' ? Promise.resolve(0)
                            : fault === 'not-a-promise' ? 42 : Promise.resolve(42);
                    },
                };
                assert.equal(await new RuntimeCapabilities(runtime).selectVariant(), 'asyncify', fault);
            }
        });
        await this.check('A successful asynchronous WASM round trip selects JSPI', async () => {
            let calls = 0;
            const runtime = {
                Suspending: class { constructor(callback) { this.callback = callback; } },
                instantiate: async (bytes, imports) => {
                    calls++;
                    assert.equal(WebAssembly.validate(bytes), true);
                    return { instance: { exports: { run: imports ? imports.m.f.callback : () => {} } } };
                },
                promising: exported => () => exported(),
            };
            assert.equal(await new RuntimeCapabilities(runtime).selectVariant(), 'jspi');
            assert.equal(calls, 2);
        });
        await this.check('Real WebAssembly without JSPI runs the Asyncify baseline probe', async () => {
            assert.equal(await new RuntimeCapabilities({ instantiate: WebAssembly.instantiate.bind(WebAssembly) }).selectVariant(), 'asyncify');
        });
        process.stdout.write(JSON.stringify({ passed: true, checks: this.checks }, null, 2) + '\n');
    }
}

await new RuntimeCapabilityChecks().run();
