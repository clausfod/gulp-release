/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    del = require('del');

// Removes generated files
gulp.task('clean', function (cb) {
    del('target', cb);
});
