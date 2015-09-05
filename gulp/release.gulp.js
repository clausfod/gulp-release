/*jslint node: true, regexp: true */

'use strict';

var gulp = require('gulp'),
    release = require('../index.js'),
    repository = 'http://git.nykreditnet.net/scm/dist/gulp-release.git';

gulp.task('prerelease', ['build'], function () {
    gulp.src('target/dist/**').pipe(release({
        prefix: 'target/dist',
        release: true,
        repository: repository
    }));
});

gulp.task('release', ['build'], function () {
    gulp.src('target/dist/**').pipe(release({
        prefix: 'target/dist',
        release: true,
        repository: repository
    }));
});
