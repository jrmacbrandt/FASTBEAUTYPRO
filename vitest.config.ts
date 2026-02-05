import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
});
