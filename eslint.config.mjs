/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 *  ________ ______  ___  ___  ______________  _____________
 * /_  __/ // / __/ / _ \/ _ \/ __/ ___/  _/ |/ / ___/_  __/
 *  / / / _  / _/  / ___/ , _/ _// /___/ //    / /__  / /
 * /_/ /_//_/___/ /_/  /_/|_/___/\___/___/_/|_/\___/ /_/
 *
 * eslint.config.mjs — CCS code standards for Vue 3 + browser JS
 * 2026-05-14
 *
 * Flat-config enforcing Cyber Code Syndicate conventions for
 * browser JS and Vue 3 SFCs. No TypeScript, no Node globals.
 * The naming table below is enforced via code-review since
 * ESLint core cannot distinguish variable/function/class
 * naming natively. Mirrors ../reckit/eslint.config.mjs
 * (last sync 2026-04-13).
 *
 *  Mirrors ../reckit/eslint.config.mjs (last sync 2026-04-13)
 *  Layered Vue ruleset per CODE_STANDARDS_MIGRATION.md §2.2
 *
 *  Enforced conventions
 *  --------------------
 *  | Scope       | Style              | Example              |
 *  |-------------|--------------------|----------------------|
 *  | functions   | camelCase          | startOverlay()       |
 *  | variables   | snake_case         | overlay_timer        |
 *  | constants   | UPPER_SNAKE_CASE   | MAX_RETRY            |
 *  | classes     | PascalCase         | HudController        |
 *  | filenames   | kebab-case         | scene-switcher.js    |
 *  | components  | PascalCase binding | <HeroSection />      |
 * ================================================================
 */

import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicorn from 'eslint-plugin-unicorn';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

const ccsBaseRules = {
  // ── Import ordering ─────────────────────────────────────
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'import/first': 'error',
  'import/newline-after-import': 'error',
  'import/no-duplicates': 'error',

  // ── Filenames ──────────────────────────────────────────
  'unicorn/filename-case': ['error', {
    case: 'kebabCase',
    ignore: ['^App\\.vue$'],
  }],

  // ── Code quality ───────────────────────────────────────
  'no-console': 'warn',
  'eqeqeq': ['error', 'always'],
  'no-var': 'error',
  'prefer-const': 'error',
  'curly': ['error', 'all'],
  'brace-style': ['error', '1tbs'],
  'semi': ['error', 'always'],
  'quotes': ['error', 'single', { avoidEscape: true }],
  'max-len': ['warn', {
    code: 80,
    ignoreUrls: true,
    ignoreStrings: true,
    ignoreTemplateLiterals: true,
    ignoreRegExpLiterals: true,
  }],
  'indent': ['error', 2, { SwitchCase: 1 }],
  'no-magic-numbers': ['warn', {
    ignore: [-1, 0, 1, 2],
    ignoreArrayIndexes: true,
    enforceConst: true,
  }],
  'no-nested-ternary': 'error',
  'no-else-return': 'error',
  'prefer-template': 'error',
  'prefer-arrow-callback': 'error',
  'object-shorthand': ['error', 'always'],

  // ── Formatting ─────────────────────────────────────────
  'comma-dangle': ['error', 'always-multiline'],
  'keyword-spacing': ['error', { before: true, after: true }],
  'space-in-parens': ['error', 'never'],
  'object-curly-spacing': ['error', 'always'],
  'eol-last': ['error', 'always'],

  // ── Security: explicit dangerous-pattern bans ──────────
  'no-eval': 'error',
  'no-implied-eval': 'error',
  'no-new-func': 'error',
  'no-script-url': 'error',

  // ── Security plugin rules ──────────────────────────────
  'security/detect-eval-with-expression': 'error',
  'security/detect-non-literal-regexp': 'warn',
  'security/detect-object-injection': 'warn',
  'security/detect-unsafe-regex': 'error',
  'security/detect-buffer-noassert': 'error',
  'security/detect-new-buffer': 'error',
  'security/detect-no-csrf-before-method-override': 'error',
  'security/detect-possible-timing-attacks': 'warn',

  // ── innerHTML ban (prefer textContent + DOM APIs) ──────
  'no-restricted-properties': ['error', {
    object: 'document',
    property: 'write',
    message: 'Use DOM APIs instead of document.write().',
  }],
  'no-restricted-syntax': ['error', {
    selector: 'AssignmentExpression[left.property.name="innerHTML"]',
    message:
      'Do not assign to innerHTML. Use textContent or DOM APIs to '
      + 'avoid XSS. For trusted i18n HTML, use vue-i18n <i18n-t> or '
      + 'v-html with a key listed in src/i18n/raw-html-keys.js.',
  }],

  // ── Unicorn extras ─────────────────────────────────────
  'unicorn/no-array-for-each': 'warn',
  'unicorn/prefer-query-selector': 'error',
  'unicorn/prefer-dom-node-append': 'error',
  'unicorn/prefer-dom-node-remove': 'error',
  'unicorn/prefer-dom-node-text-content': 'error',
  'unicorn/prefer-add-event-listener': 'error',
  'unicorn/prefer-modern-dom-apis': 'error',
  'unicorn/prefer-number-properties': 'error',

  // ── JSDoc ──────────────────────────────────────────────
  'jsdoc/require-jsdoc': 'off',
  'jsdoc/check-alignment': 'warn',
};

export default [
  // ── Global ignores ──────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.cache/**',
      'public/**',
      'src/assets/**',
    ],
  },

  // ── Base: ESLint recommended ────────────────────────────
  js.configs.recommended,

  // ── JS / MJS files ──────────────────────────────────────
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      jsdoc,
      'simple-import-sort': simpleImportSort,
      security,
      unicorn,
    },
    rules: ccsBaseRules,
  },

  // ── Node-only files (scripts/, vite.config.js) ──────────
  {
    files: ['scripts/**/*.{js,mjs}', 'vite.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'max-len': 'off',
      'no-magic-numbers': 'off',
    },
  },

  // ── Vue SFC files ───────────────────────────────────────
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      jsdoc,
      'simple-import-sort': simpleImportSort,
      security,
      unicorn,
    },
    rules: {
      ...ccsBaseRules,

      // ── Vue-specific ────────────────────────────────────
      'vue/multi-word-component-names': ['error', {
        ignores: [
          'App', 'Home', 'Index', 'Default',
          'button', 'card', 'icon', 'image', 'link', 'modal',
          'experience', 'faq', 'hero', 'skills',
        ],
      }],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', {
        registeredComponentsOnly: false,
        ignores: ['/^i18n-/', '/^router-/'],
      }],
      'vue/attribute-hyphenation': ['error', 'always', { ignore: [] }],
      'vue/v-on-event-hyphenation': ['error', 'always'],
      'vue/block-order': ['error', {
        order: ['script', 'template', 'style'],
      }],
      'vue/html-self-closing': ['error', {
        html: { void: 'always', normal: 'always', component: 'always' },
        svg: 'always',
        math: 'always',
      }],
      'vue/max-attributes-per-line': ['error', {
        singleline: { max: 3 },
        multiline: { max: 1 },
      }],
      'vue/require-default-prop': 'error',
      'vue/require-prop-types': 'error',
      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/no-v-html': 'warn',
    },
  },

  // ── Test file overrides ─────────────────────────────────
  {
    files: [
      '**/*.test.{js,mjs}',
      '**/*.spec.{js,mjs}',
      '**/__tests__/**/*.{js,mjs}',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-magic-numbers': 'off',
      'no-console': 'off',
      'max-len': 'off',
    },
  },
];
