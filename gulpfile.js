/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    deploy = require('./index.js');

require('require-dir')('./gulp');


gulp.task('test-release', ['build'], function () {
    gulp.src('target/dist/**').pipe(deploy({
        prefix: 'target/dist',
        release: false,
        repository: 'http://git.nykreditnet.net/scm/~tal/test-gulp-release.git'
    }));
});
gulp.task('default', ['watch']);
