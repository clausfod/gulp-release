/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    fs = require('fs'),
    srcFiles = ['index.js', 'gulp/*.js', 'gulpfile.js'];

gulp.task('lint', function () {
    return gulp.src(srcFiles)
            .pipe(eslint())
            .pipe(eslint.format());
});

gulp.task('lint-checkstyle', function () {
    var out;
    if (!fs.existsSync('target')) {
        fs.mkdirSync('target');
    }
    out = fs.createWriteStream('target/lint-result.xml');
    return gulp.src(srcFiles)
            .pipe(eslint())
            .pipe(eslint.format('checkstyle', out));
});
