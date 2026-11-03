// eslint.config.js — configuration ESLint (format « flat config ») pour les services Node du projet :
// backend, gateway et microservices. Le frontend garde la configuration ESLint de Create React App.
// Usage : npm run lint (analyse) / npm run lint:fix (corrections automatiques)
const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier/flat');

module.exports = [
  {
    ignores: ['**/node_modules/**', 'frontend/**', 'backend/docs/**', '**/logs/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Variables inutilisées : avertissement (les paramètres Express req/res/next sont tolérés)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^(_|req|res|next)$' }],
      // Les logs passent par Winston : console.* est signalé
      'no-console': 'warn',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'warn',
    },
  },
  {
    // Script en ligne de commande : console autorisée
    files: ['backend/seeder.js', 'eslint.config.js'],
    rules: { 'no-console': 'off' },
  },
  // Désactive les règles de mise en forme qui feraient doublon avec Prettier
  prettier,
];
