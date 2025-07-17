export default [
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.next/**',
            'coverage/**',
        ],
    },
];
