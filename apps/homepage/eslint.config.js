import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';

export default [
    {
        ignores: ['dist/**', 'node_modules/**', '*.config.js'],
    },
    js.configs.recommended,
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                FormData: 'readonly',
                Headers: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                history: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'import': importPlugin,
        },
        rules: {
            // Basic rules
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',

            // Import order enforcement
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
        },
    },
    {
        files: ['*.config.{js,ts}', 'vite.config.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                global: 'readonly',
                Buffer: 'readonly',
            },
        },
    },
];