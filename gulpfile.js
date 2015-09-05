/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    deploy = require('./index.js');

require('require-dir')('./gulp');

gulp.task('default', ['watch']);
