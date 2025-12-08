import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['next', 'react', 'react-dom', 'node:fs', 'fs', 'node:path', 'path'],
  },
  // Plugin entry
  {
    entry: ['src/plugin.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    outDir: 'dist',
    outExtension({ format }) {
      return {
        js: format === 'cjs' ? '.cjs' : '.mjs',
      };
    },
    external: ['next', 'react', 'react-dom'],
  },
  // Server utils
  {
    entry: {
      'server/utils/refreshToken': 'src/server/utils/refreshToken.ts',
      'server/utils/proxy': 'src/server/utils/proxy.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    outDir: 'dist',
    outExtension({ format }) {
      return {
        js: format === 'cjs' ? '.cjs' : '.mjs',
      };
    },
    external: ['next', 'react', 'react-dom', 'ofetch'],
  },
  // Constants
  {
    entry: {
      'constants/config': 'src/constants/config.ts',
      'constants/auth': 'src/constants/auth.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    outDir: 'dist',
    outExtension({ format }) {
      return {
        js: format === 'cjs' ? '.cjs' : '.mjs',
      };
    },
    external: [],
  },
  // Proxy and route handlers
  {
    entry: {
      proxy: 'src/proxy.ts',
      'routes/login': 'src/routes/login.ts',
      'routes/logout': 'src/routes/logout.ts',
      'routes/handler': 'src/routes/handler.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    outDir: 'dist',
    outExtension({ format }) {
      return {
        js: format === 'cjs' ? '.cjs' : '.mjs',
      };
    },
    external: ['next', 'react', 'react-dom', 'ofetch'],
  },
]);

