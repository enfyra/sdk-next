import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

describe('package.json', () => {
  it('has correct name', () => {
    expect(pkg.name).toBe('@enfyra/sdk-next')
  })

  it('has version 0.1.0', () => {
    expect(pkg.version).toBe('0.1.0')
  })

  it('is ESM', () => {
    expect(pkg.type).toBe('module')
  })

  it('has no bin field', () => {
    expect(pkg.bin).toBeUndefined()
  })

  it('exports root, client, and server', () => {
    expect(pkg.exports['.']).toBeDefined()
    expect(pkg.exports['./client']).toBeDefined()
    expect(pkg.exports['./server']).toBeDefined()
  })

  it('does not export setup or cli', () => {
    expect(pkg.exports['./setup']).toBeUndefined()
    expect(pkg.exports['./cli']).toBeUndefined()
  })

  it('has correct peer dependencies', () => {
    expect(pkg.peerDependencies.next).toBe('>=14 <17')
    expect(pkg.peerDependencies.react).toBe('>=18 <20')
  })

  it('depends on sdk-core 0.1.10', () => {
    expect(pkg.dependencies['@enfyra/sdk-core']).toBe('0.1.10')
  })

  it('depends on server-only', () => {
    expect(pkg.dependencies['server-only']).toBeDefined()
  })

  it('has sideEffects false', () => {
    expect(pkg.sideEffects).toBe(false)
  })

  it('files include dist and README', () => {
    expect(pkg.files).toContain('dist')
    expect(pkg.files).toContain('README.md')
  })
})

describe('root exports shape', () => {
  it('default export is a function', async () => {
    const mod = await import('../src/index')
    expect(typeof mod.default).toBe('function')
  })

  it('named withEnfyra is a function', async () => {
    const mod = await import('../src/index')
    expect(typeof mod.withEnfyra).toBe('function')
  })
})
