import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import ts from 'rollup-plugin-ts';

const pkg = require("./package.json")

export default [{
    input: 'src/index.tsx',
    output: [{
        file: pkg.main,
        format: 'cjs',
        sourcemap: 'inline'
    }, {
        file: pkg.module,
        format: 'esm',
        sourcemap: 'inline'
    }],
    plugins: [
        peerDepsExternal(),
        ts(),
        resolve(),
        commonjs()
    ]
}]