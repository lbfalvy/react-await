import peerDepsExternal from "rollup-plugin-peer-deps-external";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import html from '@rollup/plugin-html'
import serve from 'rollup-plugin-serve'
import replace from 'rollup-plugin-replace'

export default {
    input: 'test/index.tsx',
    output: {
        file: 'demo/main.js',
        format: 'umd',
        sourceMap: 'inline'
    },
    watch: {
        exclude: 'node_modules/**',
    },
    plugins: [
        serve('demo'),
        html({
            fileName: 'index.html',
            template: ({ bundle, scripts, title }) => `<!DOCTYPE html>
<html>
    <meta charset="utf-8">
    <head>
        <title>${title}</title>
    </head>
    <body>
        <div id='root'></div>
        ${Object.entries(bundle).map(p => p[1])
                    .filter(ch => ch.type == 'chunk').map(chunk => `<script src="${chunk.fileName}"></script>`)}
    </body>
</html>`
        }),
        replace({
            'process.env.NODE_ENV': JSON.stringify('development')
        }),
        //peerDepsExternal(),
        resolve(),
        commonjs(),
        typescript({
            tsconfigOverride: {
                strict: false
            },
            sourceMap: true
        })
    ]
}