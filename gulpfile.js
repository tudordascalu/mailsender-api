var gulp = require("gulp")
var ts = require("gulp-typescript")
var tslint = require("gulp-tslint")
// const gulp_tslint = require("gulp-tslint")
var clean = require("gulp-clean")
var server = require("gulp-develop-server")
var mocha = require("gulp-mocha")

var serverTS = ["**/*.ts", "!node_modules/**", "!bin/**"]
var tsProject = ts.createProject("tsconfig.json")

gulp.task("lint", () =>
    tsProject.src()
        .pipe(tslint({ formatter: "verbose" }))
    .pipe(tslint.report({
	summarizeFailureOutput: true
}))
)

// gulp.task("tslint", () =>
//     gulp.src("source.ts")
//         .pipe(tslint({
// 	formatter: "verbose"
// }))
//         .pipe(tslint.report())
// )

// gulp.task("tslint", () =>
//     gulp.src("source.ts")
//         .pipe(tslint({
// 	formatter: "verbose"
// }))
//         .pipe(tslint.report())
// )

// gulp.task('tslint', ['tslint'], function() {
//     gulp.src(['tests/*.ts'])
//       .pipe(gulp_tslint({
//           formatter: "prose"
//       }))
//       .pipe(gulp_tslint.report({
//           emitError: true
//       }));
// });

gulp.task("ts", ["clean"], function() {
	const tsResult = tsProject.src()
    .pipe(tsProject())
	return tsResult.js.pipe(gulp.dest("dist"))
    // return gulp
    //     .src(serverTS, {base: './'})
    //     .pipe(ts({ module: 'commonjs', noImplicitAny: true }))
    //     .pipe(gulp.dest('./dist'));
})

gulp.task("clean", function () {
	return gulp
        .src([
	"dist/app.js",
	"dist/*.js",
	"**/*.js.map",
	"!deploy/**/*.js",
	"!node_modules/**",
	"!gulpfile.js",	
	"!bin/**"
], {read: false})
        .pipe(clean())
})

gulp.task("load:fixtures", function (cb) {
	var load = require("./fixtures/load")
	return load.loadData(cb)
})

gulp.task("server:start", ["ts"], function() {
	server.listen({path: "bin/www"}, function(error) {
		console.log(error)
	})
})

gulp.task("server:restart", ["ts"], function() {
	server.restart()
})

gulp.task("default", ["server:start"], function() {
	gulp.watch(serverTS, ["server:restart"])
})

gulp.task("test", ["ts", "load:fixtures"], function() {
	return gulp
        .src("test/*.js", {read: false})
        // wait for dev server to start properly :(
        //.pipe(wait(600))
        .pipe(mocha())
        .once("error", function () {
	process.exit(1)
})
        .once("end", function () {
	process.exit()
})
})
