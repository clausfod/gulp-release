gulp-release
============

> Do pre-releases and releases of gulp based projects into Git repository.

The files in the release repository is going to be tagged with either the release version or with the
sha of the current source state if doing a pre-release.

## Usage

### Pre-release

```javascript
var release = require('gulp-release');

gulp.task('release', function() {
    return gulp.src('target/dist/**/*')
        .pipe(release({
            prefix: 'target/dist',
            release: false,
            repository: 'http://git.nykreditnet.net/scm/dist/bower-nif.git'
        }));
});
```

The given prefix will be removed before files are copied to the distribution repository.

### Release

```javascript
var release = require('gulp-release');

gulp.task('release', function() {
    return gulp.src('target/dist/**/*')
        .pipe(release({
            prefix: 'target/dist',
            release: true,
            repository: 'http://git.nykreditnet.net/scm/dist/bower-nif.git'
        }));
});
```

Setting the release flag to true causes the plugin to tag the source repository and bump the patch version of the
bower.json and package.json files in the source repository.