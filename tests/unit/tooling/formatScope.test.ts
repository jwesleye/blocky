/// <reference types="node" />
import { existsSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

const FORMAT_SCRIPT_PATH = join(process.cwd(), 'scripts/format.mjs')
const SCRATCH_FILE_NAME = '__agentshore_scratch_test__.json'
const SCRATCH_FILE_PATH = join(process.cwd(), SCRATCH_FILE_NAME)

type FormatModule = {
  getTrackedFiles: () => string[]
}

const loadFormatModule = async (): Promise<FormatModule> =>
  (await import(pathToFileURL(FORMAT_SCRIPT_PATH).href)) as FormatModule

describe('formatter scope', () => {
  afterEach(() => {
    if (existsSync(SCRATCH_FILE_PATH)) {
      rmSync(SCRATCH_FILE_PATH, { force: true })
    }
  })

  it('ignores untracked scratch files while checking tracked files', () => {
    const baseline = spawnSync(process.execPath, ['scripts/format.mjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 25_000,
    })

    writeFileSync(SCRATCH_FILE_PATH, Buffer.from([0xff, 0xfe, 0x5b, 0x00]))

    const result = spawnSync(
      process.execPath,
      ['scripts/format.mjs', '--check'],
      {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 25_000,
      },
    )

    expect(result.status).toBe(baseline.status)
    expect(result.stderr).not.toContain(SCRATCH_FILE_NAME)
    expect(result.stdout).toBe(baseline.stdout)
    expect(result.stderr).toBe(baseline.stderr)
  }, 30_000)

  it('selects tracked files without including untracked scratch files', async () => {
    writeFileSync(SCRATCH_FILE_PATH, Buffer.from([0xff, 0xfe, 0x5b, 0x00]))

    const { getTrackedFiles } = await loadFormatModule()
    const trackedFiles = getTrackedFiles()

    expect(trackedFiles).toContain('package.json')
    expect(trackedFiles).not.toContain(SCRATCH_FILE_NAME)
  })
})
