/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    jscs = require('gulp-jscs');

gulp.task('codestyle', function () {
    return gulp.src(['lib/**/*.js'])
        .pipe(jscs());
});
