import gulp from 'gulp'
import del from 'del'
import postcss from 'gulp-postcss'
import postcssImport from 'postcss-import'
import postcssUrl from 'postcss-url'
import postcssPresetEnv from 'postcss-preset-env'
import postcssCsso from 'postcss-csso'
import newer from 'gulp-newer'
import path from 'path'
import rename from 'gulp-rename'
import cached from 'gulp-cached'
import remember from 'gulp-remember'
import svgstore from 'gulp-svgstore'
import babel from 'gulp-babel'
import browserSync from 'browser-sync'

const serverInstance = browserSync.create()

const { src, dest, watch, series, parallel, lastRun } = gulp

const isDevelopment = process.env.NODE_ENV !== 'production'

export function deleteBuild () {
  return del([
    './build'
  ])
}

export function copyAssets () {
  return src('./source/assets/**/*.*', { since: lastRun(copyAssets) })
    .pipe(newer('./build/assets'))
    .pipe(dest('./build/assets'))
}

export function processIcons () {
  return src('./source/icons/**/*.svg')
    .pipe(cached('icons'))
    .pipe(rename((file) => {
      const link = file
      const name = link.dirname.split(path.sep)
      name.push(file.basename)
      link.basename = name.join('-')
    }))
    .pipe(remember('icons'))
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(dest('./build/icons'))
}

export function processMarkup () {
  return src('./source/**/*.html', { since: lastRun(processMarkup) })
    .pipe(newer('./build'))
    .pipe(dest('./build'))
}

export function processStyles () {
  return src('./source/*.css')
    .pipe(postcss([
      postcssImport,
      postcssUrl,
      postcssPresetEnv,
      postcssCsso
    ], {
      map: isDevelopment
    }))
    .pipe(dest('./build'))
}

export function processScripts () {
  return src('source/**/*.js')
    .pipe(cached('scripts'))
    .pipe(babel())
    .pipe(remember('scripts'))
    .pipe(dest('./build'))
}

function deleteCache (event, cacheName) {
  if (event.type === 'deleted') {
    delete cached.caches[`${cacheName}`][event.path]
    remember.forget(`${cacheName}`, event.path)
  }
}

export function watchFiles () {
  watch('./source/assets/**/*.*', series(copyAssets))
  watch('./source/**/*.html', series(processMarkup))
  watch('./source/**/*.css', series(processStyles))
  watch('./source/**/*.js', series(processScripts))
    .on('change', (event) => {
      deleteCache(event, 'scripts')
    })
  watch('./source/icons/**/*.*', series(processIcons))
    .on('change', (event) => {
      deleteCache(event, 'icons')
    })
}

export function runServer () {
  serverInstance.init({
    ui: false,
    notify: false,
    browser: 'firefox-developer-edition',
    server: './build'
  })
  serverInstance.watch('./build/**/*.*')
    .on('change', serverInstance.reload)
}

export const buildProject = series(
  deleteBuild,
  parallel(
    copyAssets,
    processMarkup,
    processStyles,
    processScripts,
    processIcons
  )
)

export default series(
  buildProject,
  parallel(
    watchFiles,
    runServer
  )
)
