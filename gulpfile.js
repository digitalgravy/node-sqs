'use strict';

var gulp   = require('gulp'),
    nodemon = require('gulp-nodemon'),
    plugins = require('gulp-load-plugins')();

var paths = {
  lint: ['./gulpfile.js', './lib/**/*.js'],
  watch: ['./gulpfile.js', './lib/**', './test/**/*.js', '!test/{temp,temp/**}'],
  tests: ['./test/**/*.js', '!test/{temp,temp/**}'],
  source: ['./lib/*.js']
};

var plumberConf = {};

if (process.env.CI) {
  plumberConf.errorHandler = function(err) {
    throw err;
  };
}

gulp.task('develop', function(){
  nodemon({
    script: 'example/simple.js',
    ext: 'js'
  })
    .on('change', ['test'])
    .on('restart', function(){
      console.log('[nodemon] NODE RESTARTED...');
    });
});

gulp.task('lint', function () {
  return gulp.src(paths.lint)
    .pipe(plugins.jshint('.jshintrc'))
    .pipe(plugins.jshint.reporter('jshint-stylish'));
});

gulp.task('unitTest', function () {
  gulp.src(paths.tests, {cwd: __dirname})
    .pipe(plugins.plumber(plumberConf))
    .pipe(plugins.jasmine({verbose:true}));
});

gulp.task('bump', ['test'], function () {
  var bumpType = plugins.util.env.type || 'patch'; // major.minor.patch

  return gulp.src(['./package.json'])
    .pipe(plugins.bump({ type: bumpType }))
    .pipe(gulp.dest('./'));
});

gulp.task('watch', ['test'], function () {
  gulp.watch(paths.watch, ['test']);
});

gulp.task('test', ['lint', 'unitTest']);

gulp.task('release', ['bump']);

gulp.task('default', ['test']);
