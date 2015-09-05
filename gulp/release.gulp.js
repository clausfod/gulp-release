/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    release = require('./index.js');

gulp.task('prerelease', ['build'], function () {
    gulp.src('target/dist/**').pipe(release({
        prefix: 'target/dist',
        release: true,
        repository: 'http://git.nykreditnet.net/scm/~tal/test-gulp-release.git'
    }));
});

gulp.task('release', ['build'], function () {
    gulp.src('target/dist/**').pipe(release({
        prefix: 'target/dist',
        release: true,
        repository: 'http://git.nykreditnet.net/scm/~tal/test-gulp-release.git'
    }));
});
