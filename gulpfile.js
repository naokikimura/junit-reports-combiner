const gulp = require('gulp');

function spawn(command, args = [], options) {
  const child = require('child_process')
    .spawn(command, args.filter(e => e === 0 || e), options);
  if (child.stdout) child.stdout.pipe(process.stdout);
  if (child.stderr) child.stderr.pipe(process.stderr);
  return child;
}

exports['transpile:tsc'] = function tsc() {
  return spawn('tsc', ['--pretty']);
}

exports['lint:eslint'] = function eslint() {
  const options = ['.', '--ext', '.js,.jsx,.ts,.tsx']
    .concat(process.env.CI ? ['-f', 'junit', '-o', './reports/eslint/test-results.xml'] : []);
  return spawn('eslint', options);
}

exports['test:mocha'] = function mocha() {
  const options = process.env.CI
    ? ['-R', 'xunit', '-O', 'output=./reports/mocha/test-results.xml']
    : ['-c'];
  return spawn('mocha', options);
}

exports['watch:typescript'] = function watchTypeScript() {
  const task = gulp.parallel(exports['transpile:tsc'], exports['lint:eslint']);
  return gulp.watch('./src/**/*.ts{,x}', task);
}

exports.transpile = gulp.parallel(exports['transpile:tsc']);
exports.lint = gulp.parallel(exports['lint:eslint']);
exports.build = gulp.parallel(exports.lint, exports.transpile);
exports.test = gulp.series(exports.build, exports['test:mocha']);
exports.watch = gulp.parallel(exports['watch:typescript']);
exports.default = exports.build;
