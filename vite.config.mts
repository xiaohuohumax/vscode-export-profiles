import path from 'path';
import { ConfigEnv, UserConfig, defineConfig } from 'vite';

export default defineConfig((env: ConfigEnv): UserConfig => {
  return {
    envDir: 'env',
    resolve: {
      alias: {
        '#': path.resolve(__dirname, ''),
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@utils': path.resolve(__dirname, './src/utils'),
      }
    },
    build: {
      minify: false,
      sourcemap: env.mode !== 'production',
      rollupOptions: {
        preserveEntrySignatures: 'strict',
        input: './src/extension.ts',
        external: ['vscode', 'os', 'path', 'util'],
        output: [
          {
            dir: 'out',
            format: 'cjs',
            entryFileNames: '[name].js'
          }
        ]
      }
    }
  };
});