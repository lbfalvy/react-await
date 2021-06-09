import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";

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
        resolve(),
        commonjs(),
        typescript()
    ]
},]