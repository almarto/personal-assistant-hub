// personal-assistant-hub/prettier.config.js
export default {
  // Basic formatting
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  
  // Line length
  printWidth: 80,
  
  // JSX specific
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // Other
  arrowParens: 'avoid',
  endOfLine: 'lf',
  bracketSpacing: true,
  bracketSameLine: false,
  
  // File specific overrides
  overrides: [
    {
      files: ['*.json', '*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
      },
    },
    {
      files: ['*.md'],
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
  ],
};