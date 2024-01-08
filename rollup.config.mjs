import peerDepsExternal from "rollup-plugin-peer-deps-external";
import ts from 'rollup-plugin-ts';
import fs from "fs";
import { dirname } from 'path';

const pkg = JSON.parse(fs.readFileSync("./package.json"));

const baseConfig = {
    input: 'src/index.ts',
}

export default [{
    ...baseConfig,
    output: [{
        preserveModules: true,
        dir: dirname(pkg.main),
        format: 'cjs',
        sourcemap: 'inline'
    }, {
        preserveModules: true,
        dir: dirname(pkg.module),
        format: 'esm',
        sourcemap: 'inline'
    }],
    plugins: [
        peerDepsExternal(), // React
        ts({ tsconfig: "./tsconfig.json" }),
    ]
}, {
    ...baseConfig,
    output: {
        dir: dirname(pkg.types),
        format: 'esm'
    },
    plugins: [ts({ tsconfig: {
        ...JSON.parse(fs.readFileSync("./tsconfig.json")).compilerOptions,
        emitDeclarationOnly: true,
        declaration: true
    }, })]
}]