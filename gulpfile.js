import gulp from 'gulp'
import del from 'del'
import nunjucks from 'gulp-nunjucks-render'
import postcss from 'gulp-postcss'
import postcssImport from 'postcss-import'
import postcssUrl from 'postcss-url'
import postcssCustomMedia from 'postcss-custom-media'
import postcssLogical from 'postcss-logical'
import postcssMediaMinmax from 'postcss-media-minmax'
import postcssCsso from 'postcss-csso'
import autoprefixer from 'autoprefixer'
import newer from 'gulp-newer'
import cached from 'gulp-cached'
import remember from 'gulp-remember'
import gulpEsbuild from 'gulp-esbuild'
import browserSync from 'browser-sync'

const serverInstance = browserSync.create()
const { src, dest, watch, series, parallel, lastRun } = gulp
const isDevelopment = process.env.NODE_ENV !== 'production'

export function deleteDist () {
	return del([
		'./dist'
	])
}

export function copyStatic () {
	return src('./source/static/**/*.*', { since: lastRun(copyStatic) })
		.pipe(newer('./dist'))
		.pipe(dest('./dist'))
}

export function processMarkup () {
	return src('./source/pages/**/*.njk')
		.pipe(nunjucks({
			path: ['./source/components']
		}))
		.pipe(dest('./dist'))
}

export function processStyles () {
	const urlOptions = [
		{
			filter: '**/*.svg',
			url: 'inline'
		},
		{
			filter: '**/*.*',
			url: 'rebase'
		}
	]

	return src('./source/styles/**/*.css')
		.pipe(cached('styles'))
		.pipe(remember('styles'))
		.pipe(postcss(() => ({
			plugins: [
				postcssImport(),
				postcssUrl(urlOptions),
				postcssMediaMinmax(),
				postcssCustomMedia(),
				postcssLogical(),
				autoprefixer(),
				postcssCsso()
			],
			options: {
				map: isDevelopment
			}
		})))
		.pipe(dest('./dist/styles'))
}

export function processScripts() {
	return src('./source/scripts/*.js')
		.pipe(cached('scritps'))
		.pipe(remember('scritps'))
		.pipe(gulpEsbuild({
			bundle: true,
			target: 'esnext',
			sourcemap: isDevelopment,
			minify: !isDevelopment,
		}))
		.pipe(dest('./dist/scripts'))
}

function deleteCache (event, cacheName) {
	if (event.type === 'deleted') {
		delete cached.caches[`${cacheName}`][event.path]
		remember.forget(`${cacheName}`, event.path)
	}
}

export function watchFiles () {
	watch('./source/static/**/*.*', series(copyStatic))
	watch('./source/**/*.njk', series(processMarkup))
	watch('./source/**/*.css', series(processStyles))
		.on('change', (event) => {
			deleteCache(event, 'styles')
		})
	watch('./source/**/*.js', series(processScripts))
		.on('change', (event) => {
			deleteCache(event, 'scripts')
		})
}

export function runServer () {
	serverInstance.init({
		ui: false,
		notify: false,
		server: './dist'
	})
	serverInstance.watch('./dist/**/*.*')
		.on('change', serverInstance.reload)
}

export const buildProject = series(
	deleteDist,
	parallel(
		copyStatic,
		processMarkup,
		processStyles,
		processScripts
	)
)

export default series(
	buildProject,
	parallel(
		watchFiles,
		runServer
	)
)
