import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const cacheRoot = '/tmp/rollup_typescript_cache';

const external = [
  'fs',
  'path',
  'js-yaml',
  'child_process',
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

export default [
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
    },
    external,
    plugins: [
      typescript({
        cacheRoot,
        typescript: require('typescript'),
        tsconfigOverride: {
          compilerOptions: { declaration: false },
          exclude: ['**/examples'],
        },
      }),
      terser(),
    ],
  },
  {
    input: {
      index: 'src/index.ts',
      // add other inputs here
    },
    output: [
      {
        dir: 'dist/esm',
        format: 'esm',
      },
    ],
    external,
    plugins: [
      typescript({
        cacheRoot,
        typescript: require('typescript'),
        tsconfigOverride: {
          compilerOptions: { declaration: true },
          exclude: ['**/examples'],
        },
      }),
      terser(),
    ],
  },
];
