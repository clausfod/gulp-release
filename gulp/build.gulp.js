/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify');

gulp.task('source-files', function () {
    return gulp.src(['index.js'])
        .pipe(gulp.dest('target/dist'));
});

gulp.task('files', function () {
    return gulp.src(['LICENSE', 'README.md', 'package.json'])
            .pipe(gulp.dest('target/dist'));
});

gulp.task('compress', function () {
    return gulp.src(['index.js'])
        .pipe(uglify())
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(gulp.dest('target/dist'));
});

gulp.task('build', ['lint', 'codestyle', 'source-files', 'files', 'compress']);
