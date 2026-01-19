/**
 * Unit tests for src/get-changed-file.ts
 */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

import * as coreMock from '../__fixtures__/core.ts';
import * as githubMock from '../__fixtures__/github.ts';

// Create mock spawn function
const spawnMock = mock.fn<() => EventEmitter & { stdout: Readable }>();

// Mock existsSync
const existsSyncMock = mock.fn<(path: string) => boolean>(() => true);

// Set up all mocks ONCE at module level
mock.module('@actions/core', {
  namedExports: coreMock,
});

mock.module('@actions/github', {
  namedExports: githubMock,
});

mock.module('node:child_process', {
  namedExports: {
    spawn: spawnMock,
  },
});

mock.module('node:fs', {
  namedExports: {
    existsSync: existsSyncMock,
  },
});

// Helper to create mock spawn response
function mockSpawnOutput(lines: string[]): void {
  spawnMock.mock.mockImplementation(() => {
    const stdout = Readable.from(lines.length ? lines.join('\n') + '\n' : '');
    const childProcess = new EventEmitter() as EventEmitter & {
      stdout: Readable;
    };
    childProcess.stdout = stdout;
    return childProcess;
  });
}

// Import the module under test after all mocks are set up
const { getChangedFiles } = await import('../src/get-changed-file.ts');

describe('get-changed-file.ts', () => {
  beforeEach(() => {
    coreMock.resetAllMocks();
    githubMock.resetContext();
    spawnMock.mock.resetCalls();
    existsSyncMock.mock.resetCalls();
    existsSyncMock.mock.mockImplementation(() => true);
    coreMock.getInput.mock.mockImplementation(() => '');
  });

  it('returns added and modified PHP files', async () => {
    mockSpawnOutput([
      'A\tsrc/new-file.php',
      'M\tsrc/modified-file.php',
      'A\tanother-added.php',
    ]);

    const result = await getChangedFiles();

    assert.deepStrictEqual(result.added, [
      'src/new-file.php',
      'another-added.php',
    ]);
    assert.deepStrictEqual(result.modified, ['src/modified-file.php']);
  });

  it('filters files by pattern', async () => {
    mockSpawnOutput([
      'A\tsrc/file.php',
      'A\tsrc/file.js',
      'M\ttest.php',
      'M\ttest.txt',
    ]);

    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'files') return '**.php';
      return '';
    });

    const result = await getChangedFiles();

    assert.deepStrictEqual(result.added, ['src/file.php']);
    assert.deepStrictEqual(result.modified, ['test.php']);
  });

  it('handles copied and renamed files as added', async () => {
    mockSpawnOutput(['C\tcopied-file.php', 'R\trenamed-file.php']);

    const result = await getChangedFiles();

    assert.deepStrictEqual(result.added, [
      'copied-file.php',
      'renamed-file.php',
    ]);
    assert.deepStrictEqual(result.modified, []);
  });

  it('excludes files that do not exist', async () => {
    mockSpawnOutput(['A\texists.php', 'A\tdeleted.php']);

    existsSyncMock.mock.mockImplementation((path: string) => {
      return !String(path).includes('deleted');
    });

    const result = await getChangedFiles();

    assert.deepStrictEqual(result.added, ['exists.php']);
  });

  it('returns empty arrays on error', async () => {
    spawnMock.mock.mockImplementation(() => {
      throw new Error('git not found');
    });

    const result = await getChangedFiles();

    assert.deepStrictEqual(result.added, []);
    assert.deepStrictEqual(result.modified, []);
  });

  it('supports multiple file patterns', async () => {
    mockSpawnOutput(['A\tfile.php', 'A\tfile.inc', 'A\tfile.js']);

    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'files') return '**.php,**.inc';
      return '';
    });

    const result = await getChangedFiles();

    assert.deepStrictEqual(result.added, ['file.php', 'file.inc']);
  });

  it('returns empty results when no files match pattern', async () => {
    mockSpawnOutput(['A\tfile.js', 'M\tfile.txt']);

    const result = await getChangedFiles();

    assert.deepStrictEqual(result.added, []);
    assert.deepStrictEqual(result.modified, []);
  });
});
