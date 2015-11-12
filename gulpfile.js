var gulp = require('gulp');

var browserify = require('browserify');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify')

gulp.task('default', function () {
	// Code for default task.
	
	
});

var OUT = 'build/';

gulp.task('build-core', function () {

	var b = browserify({
		entries: './js/core/HexCore.js',
		debug : true,
	});

	return b.bundle()
		.pipe( source('Ox.js') )
		.pipe( gulp.dest(OUT) )
		.pipe( streamify(uglify()) )
		.pipe( rename({extname:'.min.js'}) )
		.pipe( gulp.dest(OUT) );
});

gulp.task('build-app', function () {

	var b = browserify({
		entries: './js/app.js',
		debug : true,

	});

	return b.bundle()
		.pipe( source('OxApp.js') )
		.pipe( gulp.dest(OUT) )
		.pipe( streamify(uglify()) )
		.pipe( rename({extname:'.min.js'}) )
		.pipe( gulp.dest(OUT) );
});
