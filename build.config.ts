import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    { input: 'src/index.ts', name: 'index' },
    { input: 'src/client.ts', name: 'client' },
    { input: 'src/server.ts', name: 'server' },
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
    output: {
      banner: (chunk) => {
        if (chunk.name === 'client') return '"use client";'
        return ''
      },
    },
  },
  externals: [
    'next',
    'next/headers',
    'react',
    'react-dom',
    '@enfyra/sdk-core',
    'server-only',
    'zustand',
    'zustand/vanilla',
  ],
})
