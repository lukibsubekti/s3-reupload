module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { 
    project: './tsconfig.json',
  },
  plugins: [
    'import',
    '@typescript-eslint',
  ],
  extends: [
    // 'eslint:recommended',
    // 'plugin:@typescript-eslint/recommended',
    'airbnb-typescript/base'
  ],
  rules: {
      "@typescript-eslint/no-unused-vars": "off"
  },
  // ignorePatterns: ["*.js"]
};