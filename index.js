/*jslint node: true, regexp: true */

'use strict';

var assign = require('object-assign'),
    async = require('async'),
    fs = require('fs'),
    gutil = require('gulp-util'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    rimraf = require('rimraf'),
    semver = require('semver'),
    spawn = require('child_process').spawn,
    through = require('through2');

module.exports = function (options) {
    var self, files = [],
        repoPath = path.normalize(path.join(process.cwd(), 'deploy-' + Date.now() + '-' + (Math.floor(Math.random() * 1000))));

    options = assign({}, {
        debug: false,
        prefix: '',
        release: false,
        repository: ''
    }, options);
    options.prefix = options.prefix.replace('/', path.sep);
    if (options.bumpVersion === undefined) {
        options.bumpVersion = options.release;
    }

    return through.obj(function (file, enc, callback) {
        var p = path.normalize(path.relative(file.cwd, file.path));
        self = this;
        if (options.prefix.length > 0 && p.indexOf(options.prefix) === 0) {
            p = p.substr(options.prefix.length + 1);
        }
        files.push({
            source: file.path,
            destination: path.join(repoPath, p)
        });
        callback(null);
    },
    function gitCmd(params, cb) {
        var cmdGit, stdout = '', stderr = '';
        console.log('1');
        console.log('value: ' + params);  
        console.log('2');
        cmdGit = spawn('git', params);
        console.log('3');
        cmdGit.stdout.on('data', function (buf) {
                stdout += buf;
        });
        cmdGit.stderr.on('data', function (buf) {
            stderr += buf;
        });
        cmdGit.on('close', function (code) {
            if (stdout != '' && options.debug) {
                console.log('[stdout] "%s"', stdout);    
            }
            
            if (code !== 0) {
                cb('git push exited with code ' + code + ' [stderr]: ' + stderr);
            } else {
                cb(null, version);
            }                    
        });
    },          
    function (callback) {
        async.waterfall([
            function getVersionTag(cb) {
                var bowerJson, packageJson, version, cmdRevParse, sha1,
                    preReleaseVersion = 'build.' + process.env.BUILD_NUMBER || 'beta';

                if (fs.existsSync('bower.json')) {
                    bowerJson = JSON.parse(fs.readFileSync('bower.json'));
                    version = bowerJson.version;
                }

                if (!fs.existsSync('bower.json') && fs.existsSync('package.json')) {
                    packageJson = JSON.parse(fs.readFileSync('package.json'));
                    version = packageJson.version;
                }

                if (!fs.existsSync('bower.json') && !fs.existsSync('package.json')) {
                    cb('no.version');
                    return;
                }

                if (!options.release) {
                    cmdRevParse = spawn('git', ['rev-parse', '--short', 'HEAD']);
                    
                    gutil.log(gutil.colors.yellow('Fetching SHA hashes'));

                    var stderr = '';
                    
                    cmdRevParse.stdout.on('data', function(data) {
                        sha1 = data.toString().trim();
                    });
                    
                    cmdRevParse.stderr.on('data', function(buf) {
                        stderr += buf;
                    });

                    cmdRevParse.on('close', function (code) {
                        if (code !== 0) {
                            cb('git rev-parse exited with code ' + code + ' [stderr]: ' + stderr);
                        } else {
                            cb(null, version + '-' + preReleaseVersion + '+sha.' + sha1);
                        }
                    });
                } else {
                    cb(null, version);
                }
            },
            function cloneDistributionRepository(version, cb) {
                //var cmdClone = spawn('git', ['clone', '-b', 'master', '--single-branch', options.repository, repoPath]);
                gutil.log(gutil.colors.yellow('Cloning distribution repository ' + options.repository));
                var params = ['clone', '-b', 'master', '--single-branch', options.repository, repoPath]; 
                gitCmd(params, cb);
                
                /*var stdout = '';
                var stderr = '';
                
                cmdClone.stdout.on('data', function(buf) {
                    stdout += buf;
                });
                cmdClone.stderr.on('data', function(buf) {
                    stderr += buf;
                });

                cmdClone.on('close', function (code) {
                    if (stdout != '' && options.debug) {
                        console.log('[stdout] "%s"', stdout);    
                    }

                    if (code !== 0) {
                        cb('git clone exited with code ' + code + ' [stderr]: ' + stderr);
                    } else {
                        cb(null, version);
                    }
                });*/
            },
            function removeExistingFiles(version, cb) {
                var clean = function (folder) {
                    fs.readdirSync(folder).forEach(function (file) {
                        var filePath = path.normalize(path.join(folder, file)),
                            stats = fs.lstatSync(filePath);
                        if (stats.isDirectory()) {
                            if (file !== '.git') {
                                clean(filePath, callback);
                            }
                            return;
                        }
                        fs.unlinkSync(filePath);
                    });
                };
                gutil.log(gutil.colors.yellow('Cleaning deployment repository folder'));
                try {
                    clean(repoPath);
                    cb(null, version);
                } catch (err) {
                    cb(err);
                }
            },
            function copyDistributionFiles(version, cb) {
                gutil.log(gutil.colors.yellow('Copying distribution files to deployment folder'));
                try {
                    files.forEach(function (file) {
                        var stats = fs.lstatSync(file.source);
                        if (stats.isDirectory()) {
                            return;
                        }
                        mkdirp.sync(path.dirname(file.destination));
                        fs.writeFileSync(file.destination, fs.readFileSync(file.source));
                    });
                    cb(null, version);
                } catch (err) {
                    cb(err);
                }
            },
            function updateVersion(version, cb) {
                var bowerFile = path.join(repoPath, 'bower.json'), bowerJson,
                    packageFile = path.join(repoPath, 'package.json'), packageJson,
                    versionJson = { version: version };
                gutil.log(gutil.colors.yellow('Updating version in distribution files (bower.json and package.json)'));

                if (fs.existsSync(bowerFile)) {
                    bowerJson = JSON.parse(fs.readFileSync(bowerFile));
                    bowerJson.version = version;
                    fs.writeFileSync(bowerFile, JSON.stringify(bowerJson, null, '    '));
                }

                if (fs.existsSync(packageFile)) {
                    packageJson = JSON.parse(fs.readFileSync(packageFile));
                    packageJson.version = version;
                    fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, '    '));
                }

                if (!fs.existsSync(bowerFile) && !fs.existsSync(packageFile)) {
                    fs.writeFileSync(path.join(repoPath, 'version.json'), JSON.stringify(versionJson, null, '    '));
                }

                fs.writeFileSync('.version.json', JSON.stringify(versionJson, null, '    '));

                cb(null, version);
            },
            function addDistributionFiles(version, cb) {
                var cmdAdd = spawn('git', ['add', '--all', '.'], { cwd: repoPath });
                gutil.log(gutil.colors.yellow('Adding files to distribution repository'));
                
                var stdout = '';
                var stderr = '';
                
                cmdAdd.stdout.on('data', function(buf) {
                    stdout += buf;
                });
                cmdAdd.stderr.on('data', function(buf) {
                    stderr += buf;
                });

                cmdAdd.on('close', function (code) {
                    if (stdout != '' && options.debug) {
                        console.log('[stdout] "%s"', stdout);    
                    }
                        
                    if (code !== 0) {
                        cb('git add exited with code ' + code + ' [stderr]: ' + stderr);
                    } else {
                        cb(null, version);
                    }
                });
            },
            function commitDistributionFiles(version, cb) {
                var message = (options.release ? 'Release ' : 'Pre-release ') + version,
                cmdCommit = spawn('git', ['commit', '-m', message], { cwd: repoPath });
                gutil.log(gutil.colors.yellow('Committing files to distribution repository'));
                
                var stdout = '';
                var stderr = '';
                
                cmdCommit.stdout.on('data', function(buf) {
                    stdout += buf;
                });
                cmdCommit.stderr.on('data', function(buf) {
                    stderr += buf;
                });

                cmdCommit.on('close', function (code) {
                    if (stdout != '' && options.debug) {
                        console.log('[stdout] "%s"', stdout);    
                    }

                    if (code !== 0) {
                        cb('git commit exited with code ' + code + ' [stderr]: ' + stderr);
                    } else {
                        cb(null, version);
                    }
                });
            },
            function tagDistributionFiles(version, cb) {
                var message = options.release ? 'Release' : 'Pre-release',
                cmdTag = spawn('git', ['tag', '-f', 'v' + version, '-m', message], { cwd: repoPath });
                gutil.log(gutil.colors.yellow('Tagging files to distribution repository'));
                
                var stdout = '';
                var stderr = '';
                
                cmdTag.stdout.on('data', function(buf) {
                    stdout += buf;
                });
                cmdTag.stderr.on('data', function(buf) {
                    stderr += buf;
                });

                cmdTag.on('close', function (code) {
                    if (stdout != '' && options.debug) {
                        console.log('[stdout] "%s"', stdout);    
                    }

                    if (code !== 0) {
                        cb('git tag exited with code ' + code + ' [stderr]: ' + stderr);
                    } else {
                        cb(null, version);
                    }
                });
            },
            function pushDistributionFiles(version, cb) {
                var cmdPush = spawn('git', ['push', '--tags', 'origin', 'master'], { cwd: repoPath });
                gutil.log(gutil.colors.yellow('Pushing files to distribution repository'));

                var stdout = '';
                var stderr = '';
                cmdPush.stdout.on('data', function(buf) {
                    stdout += buf;
                });
                cmdPush.stderr.on('data', function(buf) {
                    stderr += buf;
                });
                
                cmdPush.on('close', function(code) {
                    if (stdout != '' && options.debug) {
                        console.log('[stdout] "%s"', stdout);    
                    }
                    
                    if (code !== 0) {
                        cb('git push exited with code ' + code + ' [stderr]: ' + stderr);
                    } else {
                        cb(null, version);
                    }
                });
            },
            function removeDistributionRepository(version, cb) {
                gutil.log(gutil.colors.yellow('Removing local distribution repository clone'));
                rimraf(repoPath, function (err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, version);
                    }
                });
            },
            function tagRelease(version, cb) {
                var cmdTag;
                if (options.release) {
                    cmdTag = spawn('git', ['tag', '-f', 'v' + version, '-m', 'Release']);
                    gutil.log(gutil.colors.yellow('Tagging source files'));
                    
                    var stdout = '';
                    var stderr = '';
                    
                    cmdTag.stdout.on('data', function(buf) {
                        stdout += buf;
                    });
                    cmdTag.stderr.on('data', function(buf) {
                        stderr += buf;
                    });

                    cmdTag.on('close', function (code) {
                        if (stdout != '' && options.debug) {
                            console.log('[stdout] "%s"', stdout);    
                        }

                        if (code !== 0) {
                            cb('git tag exited with code ' + code + ' [stderr]: ' + stderr);
                        } else {
                            cb(null, version);
                        }
                    });
                } else {
                    gutil.log(gutil.colors.yellow('Not tagging source files - not a release'));
                    cb(null, version);
                }
            },
            function bumpVersions(version, cb) {
                var bowerFile = 'bower.json', bowerJson,
                    packageFile = 'package.json', packageJson,
                    nextRelease;
                if (options.bumpVersion) {
                    nextRelease = semver.inc(version, 'patch');
                    gutil.log(gutil.colors.yellow('Bumbing version to "' + nextRelease + '"'));
                    if (fs.existsSync(bowerFile)) {
                        bowerJson = JSON.parse(fs.readFileSync(bowerFile));
                        bowerJson.version = nextRelease;
                        fs.writeFileSync(bowerFile, JSON.stringify(bowerJson, null, '    '));
                    }
                    if (fs.existsSync(packageFile)) {
                        packageJson = JSON.parse(fs.readFileSync(packageFile));
                        packageJson.version = nextRelease;
                        fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, '    '));
                    }
                }
                cb(null, version);
            },
            function addFiles(version, cb) {
                var versionFiles = [], cmdAdd;
                if (options.bumpVersion) {
                    gutil.log(gutil.colors.yellow('Adding versioned files to repository'));
                    if (fs.existsSync('bower.json')) {
                        versionFiles.push('bower.json');
                    }
                    if (fs.existsSync('package.json')) {
                        versionFiles.push('package.json');
                    }
                    cmdAdd = spawn('git', ['add'].concat(versionFiles));

                    var stdout = '';
                    var stderr = '';
                    
                    cmdAdd.stdout.on('data', function(buf) {
                        stdout += buf;
                    });
                    cmdAdd.stderr.on('data', function(buf) {
                        stderr += buf;
                    });

                    cmdAdd.on('close', function (code) {
                        if (stdout != '' && options.debug) {
                            console.log('[stdout] "%s"', stdout);    
                        }
                    
                        if (code !== 0) {
                            cb('git add exited with code ' + code + ' [stderr]: ' + stderr);
                        } else {
                            cb(null, version);
                        }
                    });
                } else {
                    cb(null, version);
                }
            },
            function commitFiles(version, cb) {
                var cmdCommit;
                if (options.bumpVersion) {
                    gutil.log(gutil.colors.yellow('Committing files to repository'));
                    cmdCommit = spawn('git', ['commit', '-m', '[gulp] Bumping version']);
                    
                    var stdout = '';
                    var stderr = '';
                    
                    cmdCommit.stdout.on('data', function(buf) {
                        stdout += buf;
                    });
                    cmdCommit.stderr.on('data', function(buf) {
                        stderr += buf;
                    });

                    cmdCommit.on('close', function (code) {
                        if (stdout != '' && options.debug) {
                            console.log('[stdout] "%s"', stdout);    
                        }
                    
                        if (code !== 0) {
                            cb('git commit exited with code ' + code + ' [stderr]: ' + stderr);
                        } else {
                            cb(null, version);
                        }
                    });
                } else {
                    cb(null, version);
                }
            },
            function pushFiles(version, cb) {
                var cmdPush;
                if (options.bumpVersion) {
                    cmdPush = spawn('git', ['push', '--tags', '--force', 'origin', 'master']);
                    gutil.log(gutil.colors.yellow('Pushing files to repository'));

                    var stdout = '';
                    var stderr = '';
                    
                    cmdPush.stdout.on('data', function(buf) {
                        stdout += buf;
                    });
                    cmdPush.stderr.on('data', function(buf) {
                        stderr += buf;
                    });
                    
                    cmdPush.on('close', function(code) {
                        if (stdout != '' && options.debug) {
                            console.log('[stdout] "%s"', stdout);    
                        }
                        
                        if (code !== 0) {
                            cb('git push exited with code ' + code + ' [stderr]: ' + stderr);
                        } else {
                            cb(null, version);
                        }
                    });
                } else {
                    cb(null, version);
                }
            }          
        ], function (err) {
            if (err) {
                switch (err) {
                case 'no.version':
                    gutil.log(gutil.colors.magenta('Could not find bower.json or package.json file to read version'));
                    break;
                case 'no.changes':
                    gutil.log(gutil.colors.magenta('No changes to the previous version'));
                    break;
                default:
                    self.emit('error', new gutil.PluginError('gulp-deploy-git', err));
                }
            }
            callback(null);
        });
    });
};
