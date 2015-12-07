var gulp = require('gulp');
var git = require('gulp-git');

// Run git init
// src is the root folder for git to initialize
gulp.task('init', function () {
    git.init(function (err) {
        if (err) throw err;
    });
});

// Run git init with options
gulp.task('init', function () {
    git.init({args: '--quiet --bare'}, function (err) {
        if (err) throw err;
    });
});

// Run git add
// src is the file(s) to add (or ./*)
gulp.task('add', function () {
    return gulp.src('./git-test/*')
        .pipe(git.add());
});

// Run git add with options
gulp.task('add', function () {
    return gulp.src('./git-test/*')
        .pipe(git.add({args: '-f -i -p'}));
});

// Run git commit
// src are the files to commit (or ./*)
gulp.task('commit', function () {
    return gulp.src('./git-test/*')
        .pipe(git.commit('initial commit'));
});

// Run git commit with options
gulp.task('commit', function () {
    return gulp.src('./git-test/*')
        .pipe(git.commit('initial commit', {args: '-A --amend -s'}));
});

// Run git commit without checking for a message using raw arguments
gulp.task('commit', function () {
    return gulp.src('./git-test/*')
        .pipe(git.commit(undefined, {
            args: '-m "initial commit"',
            disableMessageRequirement: true
        }));
});

// Run git commit without appending a path to the commits
gulp.task('commit', function () {
    return gulp.src('./git-test/*')
        .pipe(git.commit('initial commit', {
            disableAppendPaths: true
        }));
});

// Run git commit, passing multiple messages as if calling
// git commit -m "initial commit" -m "additional message"
gulp.task('commit', function () {
    return gulp.src('./git-test/*')
        .pipe(git.commit(['initial commit', 'additional message']));
});

// Run git commit, emiting 'data' event during progress
// This is useful when you have long running githooks
// and want to show progress to your users on screen
gulp.task('commit', function () {
    return gulp.src('./git-test/*')
        .pipe(git.commit('initial commit', {emitData: true}))
        .on('data', function (data) {
            console.log(data);
        });
});

// Run git remote add
// remote is the remote repo
// repo is the https url of the repo
gulp.task('addremote', function () {
    git.addRemote('origin', 'https://github.com/stevelacy/git-test', function (err) {
        if (err) throw err;
    });
});

// Run git remote remove
// remote is the remote repo
gulp.task('removeremote', function () {
    git.removeRemote('origin', function (err) {
        if (err) throw err;
    });
});

// Run git push
// remote is the remote repo
// branch is the remote branch to push to
gulp.task('push', function () {
    git.push('origin', 'master', function (err) {
        if (err) throw err;
    });
});

// Run git push with options
// branch is the remote branch to push to
gulp.task('push', function () {
    git.push('origin', 'master', {args: " -f"}, function (err) {
        if (err) throw err;
    });
});

// Run git pull
// remote is the remote repo
// branch is the remote branch to pull from
gulp.task('pull', function () {
    git.pull('origin', 'master', {args: '--rebase'}, function (err) {
        if (err) throw err;
    });
});

// Run git fetch
// Fetch refs from all remotes
gulp.task('fetch', function () {
    git.fetch('', '', {args: '--all'}, function (err) {
        if (err) throw err;
    });
});

// Run git fetch
// Fetch refs from origin
gulp.task('fetch', function () {
    git.fetch('origin', '', function (err) {
        if (err) throw err;
    });
});

// Clone a remote repo
gulp.task('clone', function () {
    git.clone('https://github.com/stevelacy/gulp-git', function (err) {
        if (err) throw err;
    });
});

// Clone remote repo to subs folder ($CWD/subs/folder/git-test)
gulp.task('clonesub', function () {
    git.clone('https://github.com/stevelacy/git-test', {args: './subs/folder'}, function (err) {
        // handle err
    });
});

// Tag the repo with a version
gulp.task('tag', function () {
    git.tag('v1.1.1', 'Version message', function (err) {
        if (err) throw err;
    });
});

// Tag the repo With signed key
gulp.task('tagsec', function () {
    git.tag('v1.1.1', 'Version message with signed key', {args: "signed"}, function (err) {
        if (err) throw err;
    });
});

// Create a git branch
gulp.task('branch', function () {
    git.branch('newBranch', function (err) {
        if (err) throw err;
    });
});

// Checkout a git branch
gulp.task('checkout', function () {
    git.checkout('branchName', function (err) {
        if (err) throw err;
    });
});

// Create and switch to a git branch
gulp.task('checkout', function () {
    git.checkout('branchName', {args: '-b'}, function (err) {
        if (err) throw err;
    });
});

// Merge branches to master
gulp.task('merge', function () {
    git.merge('branchName', function (err) {
        if (err) throw err;
    });
});

// Reset a commit
gulp.task('reset', function () {
    git.reset('SHA', function (err) {
        if (err) throw err;
    });
});

// Git rm a file or folder
gulp.task('rm', function () {
    return gulp.src('./gruntfile.js')
        .pipe(git.rm());
});

gulp.task('addSubmodule', function () {
    git.addSubmodule('https://github.com/stevelacy/git-test', 'git-test', {args: '-b master'});
});

gulp.task('updateSubmodules', function () {
    git.updateSubmodule({args: '--init'});
});

// Working tree status
gulp.task('status', function () {
    git.status({args: '--porcelain'}, function (err, stdout) {
        if (err) throw err;
    });
});

// Other actions that do not require a Vinyl
gulp.task('log', function () {
    git.exec({args: 'log --follow index.js'}, function (err, stdout) {
        if (err) throw err;
    });
});

// Git clean files
gulp.task('clean', function () {
    git.clean({args: '-f'}, function (err) {
        if (err) throw err;
    });
});

// Run gulp's default task
gulp.task('default', ['add']);