// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

type PackageJson = {
  devDependencies?: Record<string, string>
  overrides?: Record<string, string>
}

type LockfilePackage = {
  version: string
}

type PackageLock = {
  packages?: Record<string, LockfilePackage>
}

const readPackageJson = (): PackageJson =>
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as PackageJson

const readPackageLock = (): PackageLock =>
  JSON.parse(
    readFileSync(join(ROOT, 'package-lock.json'), 'utf-8'),
  ) as PackageLock

function semverAtLeast(actual: string, minVersion: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^[^0-9]*/, '')
      .split('.')
      .map(Number)
  const [aMaj, aMin, aPatch] = parse(actual)
  const [mMaj, mMin, mPatch] = parse(minVersion)
  if (aMaj !== mMaj) return aMaj > mMaj
  if (aMin !== mMin) return aMin > mMin
  return aPatch >= mPatch
}

describe('dependency audit constraints (issue #510)', () => {
  it('package.json vite is ^8.0.16', () => {
    const pkg = readPackageJson()
    expect(pkg.devDependencies?.['vite']).toBe('^8.0.16')
  })

  it('package.json @vitejs/plugin-react is ^6.0.2', () => {
    const pkg = readPackageJson()
    expect(pkg.devDependencies?.['@vitejs/plugin-react']).toBe('^6.0.2')
  })

  it('package.json tsx remains ^4.22.4', () => {
    const pkg = readPackageJson()
    expect(pkg.devDependencies?.['tsx']).toBe('^4.22.4')
  })

  it('package.json overrides.esbuild is 0.28.1', () => {
    const pkg = readPackageJson()
    expect(pkg.overrides?.['esbuild']).toBe('0.28.1')
  })

  it('every lockfile esbuild entry resolves to 0.28.1 or newer', () => {
    const lock = readPackageLock()
    const esbuildEntries = Object.entries(lock.packages ?? {}).filter(
      ([path]) => {
        const parts = path.split('/')
        return parts[parts.length - 1] === 'esbuild'
      },
    )
    expect(esbuildEntries.length).toBeGreaterThan(0)
    for (const [path, pkg] of esbuildEntries) {
      expect(
        semverAtLeast(pkg.version, '0.28.1'),
        `${path} has esbuild@${pkg.version}, expected >= 0.28.1`,
      ).toBe(true)
    }
  })

  it('node_modules/vite resolves to 8.0.16 or newer', () => {
    const lock = readPackageLock()
    const vitePkg = lock.packages?.['node_modules/vite']
    expect(vitePkg).toBeDefined()
    expect(
      semverAtLeast(vitePkg!.version, '8.0.16'),
      `vite@${vitePkg?.version} expected >= 8.0.16`,
    ).toBe(true)
  })

  it('node_modules/@vitejs/plugin-react resolves to 6.0.2 or newer', () => {
    const lock = readPackageLock()
    const pluginPkg = lock.packages?.['node_modules/@vitejs/plugin-react']
    expect(pluginPkg).toBeDefined()
    expect(
      semverAtLeast(pluginPkg!.version, '6.0.2'),
      `@vitejs/plugin-react@${pluginPkg?.version} expected >= 6.0.2`,
    ).toBe(true)
  })
})
