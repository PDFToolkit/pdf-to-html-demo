/** A public failure code; browser implementation details stay inside the Worker. */
export class RuntimeCapabilityFailure extends Error {
    constructor(code) {
        super(code);
        this.code = code;
    }
}

/** Select a runtime by executing its required capability, independently of locale. */
export class RuntimeCapabilities {
    constructor(webAssembly = globalThis.WebAssembly) {
        this.webAssembly = webAssembly;
    }

    async selectVariant() {
        const wasm = this.webAssembly;
        if (typeof wasm?.instantiate !== 'function') throw new RuntimeCapabilityFailure('wasm_unavailable');
        // A blocked or disabled WebAssembly engine must fail before downloading PHP.
        // Asyncify is a compatibility choice, not a way around a browser restriction.
        try {
            await wasm.instantiate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
        } catch {
            throw new RuntimeCapabilityFailure('wasm_unavailable');
        }
        if (typeof wasm.Suspending !== 'function' || typeof wasm.promising !== 'function') return 'asyncify';
        try {
            // Import m.f(): i32 and export run(): i32, which calls that import.
            // Both the suspension and resumed result must work, not just API names.
            const module = new Uint8Array([
                0, 97, 115, 109, 1, 0, 0, 0,
                1, 5, 1, 96, 0, 1, 127,
                2, 7, 1, 1, 109, 1, 102, 0, 0,
                3, 2, 1, 0,
                7, 7, 1, 3, 114, 117, 110, 0, 1,
                10, 6, 1, 4, 0, 16, 0, 11,
            ]);
            const { instance } = await wasm.instantiate(module, {
                m: { f: new wasm.Suspending(() => Promise.resolve(42)) },
            });
            const result = wasm.promising(instance.exports.run)();
            return result instanceof Promise && await result === 42 ? 'jspi' : 'asyncify';
        } catch {
            return 'asyncify';
        }
    }
}
