/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    complexity = require('gulp-complexity');

gulp.task('complexity', function () {
    return gulp.src(['index.js'])
        .pipe(complexity());
});
