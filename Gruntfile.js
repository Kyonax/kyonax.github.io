/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Gruntfile — favicon generation only. Invoked via `npm run generate-favicons`
 * and chained by `npm run build-all`.
 *
 * Inline configuration: this file is CommonJS (Grunt requires it), and
 * src/data/data.js is ESM. Rather than wiring an ESM-↔-CJS bridge for one
 * static config block, the favicon path + dest are duplicated here.
 *
 * Note: `grunt-favicons` calls ImageMagick `convert`, which is deprecated.
 * Future option: switch to vite-plugin-favicons (PERFORMANCE_MIGRATION.md
 * §3, §7.5 decision point #6 — currently keeping Grunt for less churn).
 */

const FAVICON = {
  path: 'src/assets/favicon.png',
  dest: 'dist/favicons',
};

module.exports = function (grunt) {
  grunt.initConfig({
    favicons: {
      options: {
        debug: true,
        windowsTile: false,
      },
      icons: {
        src: FAVICON.path,
        dest: FAVICON.dest,
      },
    },
  });

  grunt.loadNpmTasks('grunt-favicons');
  grunt.registerTask('default', ['favicons']);
};
