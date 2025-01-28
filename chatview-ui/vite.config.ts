import { resolve } from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    css: {
        modules: {
            localsConvention: 'camelCaseOnly',
        },
    },
    root: __dirname,
    base: './',
    build: {
        emptyOutDir: false,
        outDir: __dirname + '/../dist/chatview',
        target: 'esnext',
        assetsDir: '.',
        minify: false,
        sourcemap: true,
        reportCompressedSize: false,
        rollupOptions: {
            watch: {
                include: ['**'],
                exclude: [__dirname + '/../node_modules', __dirname + '/../src'],
            },
            input: {
                index: resolve(__dirname, 'index.html'),
                search: resolve(__dirname, 'search.html'),
            },
            output: {
                entryFileNames: '[name].js',
                manualChunks: {
                    'vendor': ['react', 'react-dom'],
                    'ui': ['@vscode/webview-ui-toolkit']
                }
            },
        },
        cache: true,
        cssCodeSplit: true,
        chunkSizeWarningLimit: 1000
    },
    server: {
        hmr: {
            overlay: false
        }
    },
    optimizeDeps: {
        include: ['react', 'react-dom', '@vscode/webview-ui-toolkit']
    }
})
