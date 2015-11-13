var gulp = require('gulp');

var browserify = require('browserify');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify')

var watchify = require('watchify');
var gutil    = require('gulp-util');

gulp.task('default', function () {
	// Code for default task.
	
	
});

var OUT = 'build/';

function rebundle(bundler) {
	return bundler.bundle()
		.on('error', gutil.log.bind(gutil, 'Browserify Error'))
		.pipe( source('ox-app.js') )
		// output concatenated version
		.pipe( gulp.dest(OUT) )
		// minify + output
		.pipe( streamify(uglify()) )
		.pipe( rename({extname:'.min.js'}) )
		.pipe( gulp.dest(OUT) )
		// log errors
		.on("error", console.log)
}
gulp.task('build-watch', function () {

	var bundler = browserify({
		// Standard
		entries: './js/ox-app.js',
		debug : true,

		// Watchify
		cache: {},
		packageCache:{},
		plugin: [watchify],
	});

	bundler.on('update', function(){rebundle(bundler)});
	bundler.on('log', gutil.log);

	return rebundle(bundler);
});

gulp.task('build-core', function () {

	var b = browserify({
		entries: './js/core/ox-core.js',
		debug : true,
	});

	return b.bundle()
		.pipe( source('ox-core.js') )
		.pipe( gulp.dest(OUT) )
		.pipe( streamify(uglify()) )
		.pipe( rename({extname:'.min.js'}) )
		.pipe( gulp.dest(OUT) );
});

gulp.task('build-app', function () {

	var bundler = browserify({
		entries: './js/ox-app.js',
		debug : true,

	});

	return rebundle(bundler);
});
