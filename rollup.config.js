import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'
import css from 'rollup-plugin-css-only'
import babel from '@rollup/plugin-babel'
import banner from './banner'

const production = !process.env.ROLLUP_WATCH

function serve () {
  let server

  function toExit () {
    if (server) server.kill(0)
  }

  return {
    writeBundle () {
      if (server) return
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true
      })

      process.on('SIGTERM', toExit)
      process.on('exit', toExit)
    }
  }
}

export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/tiroir/tiroir.esm.js', format: 'es', banner },
    { file: 'dist/tiroir/tiroir.esm.min.js', format: 'es', banner, plugins: [terser()] },
    { file: 'dist/tiroir/tiroir.js', format: 'umd', banner, name: 'Tiroir' },
    { file: 'dist/tiroir/tiroir.min.js', format: 'umd', name: 'Tiroir', banner, plugins: [terser()] }
  ],
  plugins: [
    svelte({
      compilerOptions: {
        // enable run-time checks when not in production
        dev: !production
      }
    }),
    css({ output: 'tiroir.css' }),
    resolve(),
    babel({ babelHelpers: 'bundled' }),
    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `dist` directory and refresh the
    // browser on changes when not in production
    !production && livereload('dist')

  ],
  watch: {
    clearScreen: false
  }
}
