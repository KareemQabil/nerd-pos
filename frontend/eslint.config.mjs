import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import importPlugin from 'eslint-plugin-import';
import boundaries from 'eslint-plugin-boundaries';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.gen.ts',
      'src/routeTree.gen.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      boundaries,
    },
    settings: {
      react: { version: 'detect' },
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'entities', pattern: 'src/entities/**' },
        { type: 'features', pattern: 'src/features/**' },
        { type: 'widgets', pattern: 'src/widgets/**' },
        { type: 'pages', pattern: 'src/pages/**' },
        { type: 'routes', pattern: 'src/routes/**' },
        { type: 'processes', pattern: 'src/processes/**' },
        { type: 'app', pattern: 'src/app/**' },
      ],
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-restricted-globals': ['error', 'fetch'],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'next', message: 'Next.js is not allowed in this project.' },
            { name: 'next/router', message: 'Use TanStack Router.' },
            { name: 'next/navigation', message: 'Use TanStack Router.' },
          ],
        },
      ],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'shared', allow: ['shared'] },
            { from: 'entities', allow: ['shared', 'entities'] },
            { from: 'features', allow: ['shared', 'entities'] },
            { from: 'widgets', allow: ['shared', 'entities', 'features', 'widgets'] },
            { from: 'pages', allow: ['shared', 'entities', 'features', 'widgets', 'pages'] },
            { from: 'routes', allow: ['shared', 'entities', 'features', 'widgets', 'pages', 'routes', 'app'] },
            { from: 'processes', allow: ['shared', 'entities', 'features', 'processes'] },
            { from: 'app', allow: ['shared', 'entities', 'features', 'widgets', 'pages', 'routes', 'processes', 'app'] },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
];
