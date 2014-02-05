/*global module*/
/*
Installing Grunt and associated contributions

- once only per machine
install node and npm:
	http://nodejs.org/download/
install grunt cli:
	npm install -g grunt-cli

- per project
npm install grunt-contrib-jasmine --save-dev
npm install grunt-notify --save-dev
npm install grunt-contrib-watch --save-dev

*/

module.exports = function (grunt) {
	'use strict';
	grunt.initConfig({
		notify: {
			jasmine: {
				options: {
					title: 'MapJS Jasmine Tests',
					message: 'jasmine test success'
				}
			}
		},
		watch: {
			specs: {
				files: ['test/*-spec.js'],
				tasks: ['jasmine'],
				options: {
					spawn: false
				}
			},
			src: {
				files: ['src/*.js'],
				tasks: ['jasmine', 'notify:jasmine'],
				options: {
					spawn: false
				}

			}
		},
		jasmine: {
			all: {
				src: ['src/*.js'],
				options: {
					template: 'test-lib/grunt.tmpl',
					outfile: 'SpecRunner.html',
					keepRunner: true,
					specs: [
						'test/*-spec.js',
					],
					vendor: [
						'src/mapjs.js',
						'http://mindmup.s3.amazonaws.com/lib/jquery-1.9.1.min.js',
						'http://mindmup.s3.amazonaws.com/lib/bootstrap-2.3.1.min.js',
						'http://mindmup.s3.amazonaws.com/lib/jquery-ui-1.10.0.custom.min.js',
						'http://mindmup.s3.amazonaws.com/lib/kinetic-v4.5.4.min.js',
						'http://mindmup.s3.amazonaws.com/lib/color-0.4.1.min.js'
					],
					helpers: [
						'test-lib/describe-batch.js'
					]
				}
			}
		}
	});

	// Load local tasks.
	grunt.loadNpmTasks('grunt-contrib-jasmine');
	grunt.loadNpmTasks('grunt-notify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.event.on('watch', function (action, filepath, target) {
		grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
		var options = grunt.config(['jasmine', 'all']);
		if (target === 'specs') {
			options.options.specs = [filepath];
		} else {
			options.options.specs = ['test/*-spec.js'];
		}
		grunt.config(['jasmine', 'all'], options);

	});
};
