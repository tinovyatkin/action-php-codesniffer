/**
 * Unit tests for src/main.ts
 */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

import * as coreMock from '../__fixtures__/core.ts';

// Create mocks for dependencies with default implementations
const getChangedFilesMock = mock.fn<() => Promise<{ added: string[]; modified: string[] }>>(
  async () => ({ added: [], modified: [] })
);
const runOnCompleteFilesMock = mock.fn((_files: string[]) => 0);
const runOnBlameMock = mock.fn(async (_files: string[]) => {});

// Get filesystem paths for mocking (convert from file:// URL to path)
const getChangedFilePath = new URL(import.meta.resolve('../src/get-changed-file.ts')).pathname;
const runOnFilesPath = new URL(import.meta.resolve('../src/run-on-files.ts')).pathname;
const runOnBlamePath = new URL(import.meta.resolve('../src/run-on-blame.ts')).pathname;

// Set up all mocks ONCE at module level
mock.module('@actions/core', {
  namedExports: coreMock,
});

mock.module(getChangedFilePath, {
  namedExports: {
    getChangedFiles: getChangedFilesMock,
  },
});

mock.module(runOnFilesPath, {
  namedExports: {
    runOnCompleteFiles: runOnCompleteFilesMock,
  },
});

mock.module(runOnBlamePath, {
  namedExports: {
    runOnBlame: runOnBlameMock,
  },
});

// Mock path module for ESM compatibility
mock.module('node:path', {
  namedExports: {
    join: (...args: string[]) => args.join('/'),
  },
});

// Import the module under test after all mocks are set up
const { run } = await import('../src/main.ts');

describe('main.ts', () => {
  beforeEach(() => {
    // Reset all mock call history
    coreMock.resetAllMocks();
    getChangedFilesMock.mock.resetCalls();
    runOnCompleteFilesMock.mock.resetCalls();
    runOnBlameMock.mock.resetCalls();
  });

  it('warns and exits when no files changed', async () => {
    getChangedFilesMock.mock.mockImplementation(async () => ({
      added: [],
      modified: [],
    }));
    coreMock.getInput.mock.mockImplementation(() => 'blame');

    await run();

    assert.strictEqual(coreMock.warning.mock.callCount(), 1);
    const warningMsg = coreMock.warning.mock.calls[0].arguments[0] as string;
    assert.ok(
      warningMsg.includes('No files'),
      `Expected warning about no files, got: ${warningMsg}`
    );
    assert.strictEqual(runOnCompleteFilesMock.mock.callCount(), 0);
    assert.strictEqual(runOnBlameMock.mock.callCount(), 0);
  });

  it('runs on complete files when scope is files', async () => {
    getChangedFilesMock.mock.mockImplementation(async () => ({
      added: ['new.php'],
      modified: ['changed.php'],
    }));
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'scope') return 'files';
      return '';
    });

    runOnCompleteFilesMock.mock.mockImplementation((_files: string[]) => 0);

    await run();

    assert.strictEqual(
      runOnCompleteFilesMock.mock.callCount(),
      1,
      'runOnCompleteFiles should be called once'
    );
    const [files] = runOnCompleteFilesMock.mock.calls[0].arguments;
    assert.ok(
      (files as string[]).includes('new.php'),
      'Should include new.php'
    );
    assert.ok(
      (files as string[]).includes('changed.php'),
      'Should include changed.php'
    );
    assert.strictEqual(runOnBlameMock.mock.callCount(), 0);
  });

  it('runs on complete files only for added files in blame scope', async () => {
    getChangedFilesMock.mock.mockImplementation(async () => ({
      added: ['new.php'],
      modified: [],
    }));
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'scope') return 'blame';
      return '';
    });
    runOnCompleteFilesMock.mock.mockImplementation(() => 0);

    await run();

    assert.strictEqual(
      runOnCompleteFilesMock.mock.callCount(),
      1,
      'runOnCompleteFiles should be called once for added files'
    );
    const [files] = runOnCompleteFilesMock.mock.calls[0].arguments;
    assert.deepStrictEqual(files, ['new.php']);
    assert.strictEqual(runOnBlameMock.mock.callCount(), 0);
  });

  it('runs blame check for modified files in blame scope', async () => {
    getChangedFilesMock.mock.mockImplementation(async () => ({
      added: [],
      modified: ['changed.php'],
    }));
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'scope') return 'blame';
      return '';
    });
    runOnBlameMock.mock.mockImplementation(async () => {});

    await run();

    assert.strictEqual(
      runOnBlameMock.mock.callCount(),
      1,
      'runOnBlame should be called once'
    );
    const [files] = runOnBlameMock.mock.calls[0].arguments;
    assert.deepStrictEqual(files, ['changed.php']);
    assert.strictEqual(runOnCompleteFilesMock.mock.callCount(), 0);
  });

  it('runs complete files for added when both added and modified exist in blame scope', async () => {
    getChangedFilesMock.mock.mockImplementation(async () => ({
      added: ['new.php'],
      modified: ['changed.php'],
    }));
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'scope') return 'blame';
      return '';
    });
    runOnCompleteFilesMock.mock.mockImplementation(() => 0);

    await run();

    // In blame scope with added files, runOnCompleteFiles is called for added
    assert.strictEqual(
      runOnCompleteFilesMock.mock.callCount(),
      1,
      'runOnCompleteFiles should be called for added files'
    );
    const [addedFiles] = runOnCompleteFilesMock.mock.calls[0].arguments;
    assert.deepStrictEqual(addedFiles, ['new.php']);

    // runOnBlame is NOT called when there are added files (current behavior)
    assert.strictEqual(runOnBlameMock.mock.callCount(), 0);
  });

  it('sets failed status on error', async () => {
    getChangedFilesMock.mock.mockImplementation(async () => {
      throw new Error('Git error');
    });
    coreMock.getInput.mock.mockImplementation(() => 'blame');

    await run();

    assert.strictEqual(coreMock.setFailed.mock.callCount(), 1);
  });

  it('logs changed files info', async () => {
    getChangedFilesMock.mock.mockImplementation(async () => ({
      added: ['new.php'],
      modified: [],
    }));
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'scope') return 'blame';
      return '';
    });
    runOnCompleteFilesMock.mock.mockImplementation(() => 0);

    await run();

    assert.strictEqual(coreMock.info.mock.callCount(), 1);
    const infoMsg = coreMock.info.mock.calls[0].arguments[0] as string;
    assert.ok(infoMsg.includes('new.php'), 'Should log the changed files');
  });
});
