import { existsSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const PRETTIER_BIN = require.resolve('prettier/bin/prettier.cjs')

export const getTrackedFiles = () => {
  const output = execFileSync('git', ['ls-files'], { encoding: 'utf-8' })

  return output.split(/\r?\n/).filter((file) => file.length > 0)
}

const parseMode = (args) => {
  const modes = args.filter((arg) => arg === '--check' || arg === '--write')

  if (modes.length !== 1 || modes.length !== args.length) {
    throw new Error('Usage: node scripts/format.mjs --check|--write')
  }

  return modes[0]
}

const run = () => {
  const mode = parseMode(process.argv.slice(2))
  const trackedFiles = getTrackedFiles()

  if (!existsSync(PRETTIER_BIN)) {
    throw new Error(`Prettier binary not found at ${PRETTIER_BIN}`)
  }

  if (trackedFiles.length === 0) {
    return 0
  }

  const result = spawnSync(
    process.execPath,
    [PRETTIER_BIN, mode, '--ignore-unknown', ...trackedFiles],
    { stdio: 'inherit' },
  )

  if (result.error) {
    throw result.error
  }

  return result.status ?? 1
}

const isDirectRun =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  try {
    process.exitCode = run()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
