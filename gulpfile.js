/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp');

require('require-dir')('./gulp');

gulp.task('default', ['watch']);
