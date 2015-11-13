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

	var b = browserify({
		entries: './js/ox-app.js',
		debug : true,

	});

	return b.bundle()
		.pipe( source('ox-app.js') )
		.on("error", console.log)
		.pipe( gulp.dest(OUT) )
		.on("error", console.log)
		.pipe( streamify(uglify()) )
		.on("error", console.log)
		.pipe( rename({extname:'.min.js'}) )
		.on("error", console.log)
		.pipe( gulp.dest(OUT) )
		.on("error", console.log);
});
