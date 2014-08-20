module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                banner: '/*! <%= pkg.name %> \n by @spencermountain\n <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                footer: "\n\n return freebase; })()\n})(jQuery)"
            },
            dist: {
                files: {
                    './client_side/core/freebase.js': ['./src/helpers/grunt_header.js', './src/helpers/http.js', './src/helpers/helpers.js', './src/core.js'],
                    './client_side/freebase.js': ['./src/helpers/grunt_header.js', './src/helpers/http.js', './src/helpers/data.js', './src/helpers/helpers.js', './src/core.js', './src/sugar.js', './src/geo.js', './src/graph.js', './src/write.js', './src/oauth2.js']
                },
            },
        },
        uglify: {
            static_mappings: {
                files: [
                    { src: ['./client_side/freebase.js'],
                      dest: './client_side/freebase.min.js' },
                    { src: ['./client_side/core/freebase.js'],
                      dest: './client_side/core/freebase.min.js' },
                ],
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['concat', 'uglify']);

};
