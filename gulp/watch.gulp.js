/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp');

// Watches the source tree for changes
gulp.task('watch', function () {
    gulp.watch(['index.js'], ['lint']);
});
