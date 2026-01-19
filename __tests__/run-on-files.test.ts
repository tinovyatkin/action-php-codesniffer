/**
 * Unit tests for src/run-on-files.ts
 */
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';

import * as coreMock from '../__fixtures__/core.ts';

// Mock child_process before importing the module under test
const execSyncMock = mock.fn<typeof import('node:child_process').execSync>();

mock.module('@actions/core', {
  namedExports: coreMock,
});

mock.module('node:child_process', {
  namedExports: {
    execSync: execSyncMock,
  },
});

// Import the module under test after mocking
const { runOnCompleteFiles } = await import('../src/run-on-files.ts');

describe('run-on-files.ts', () => {
  beforeEach(() => {
    coreMock.resetAllMocks();
    execSyncMock.mock.resetCalls();
  });

  it('runs phpcs with default arguments', () => {
    // Setup mocks
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'phpcs_path') return 'phpcs';
      return '';
    });

    const files = ['test1.php', 'test2.php'];
    const result = runOnCompleteFiles(files);

    assert.strictEqual(result, 0);
    assert.strictEqual(execSyncMock.mock.callCount(), 1);

    const [command] = execSyncMock.mock.calls[0].arguments;
    assert.ok(
      (command as string).includes('phpcs'),
      'Command should include phpcs'
    );
    assert.ok(
      (command as string).includes('--report=checkstyle'),
      'Command should include checkstyle report'
    );
    assert.ok(
      (command as string).includes('test1.php'),
      'Command should include first file'
    );
    assert.ok(
      (command as string).includes('test2.php'),
      'Command should include second file'
    );
  });

  it('includes standard option when provided', () => {
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'phpcs_path') return 'phpcs';
      if (name === 'standard') return 'PSR2';
      return '';
    });

    runOnCompleteFiles(['test.php']);

    const [command] = execSyncMock.mock.calls[0].arguments;
    assert.ok(
      (command as string).includes('--standard=PSR2'),
      'Command should include standard option'
    );
  });

  it('ignores warnings when fail_on_warnings is false', () => {
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'phpcs_path') return 'phpcs';
      if (name === 'fail_on_warnings') return 'false';
      return '';
    });

    runOnCompleteFiles(['test.php']);

    const [command] = execSyncMock.mock.calls[0].arguments;
    assert.ok(
      (command as string).includes('--runtime-set ignore_warnings_on_exit 1'),
      'Command should ignore warnings'
    );
  });

  it('ignores warnings when fail_on_warnings is off', () => {
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'phpcs_path') return 'phpcs';
      if (name === 'fail_on_warnings') return 'off';
      return '';
    });

    runOnCompleteFiles(['test.php']);

    const [command] = execSyncMock.mock.calls[0].arguments;
    assert.ok(
      (command as string).includes('--runtime-set ignore_warnings_on_exit 1'),
      'Command should ignore warnings'
    );
  });

  it('returns 1 and sets failed when phpcs throws', () => {
    coreMock.getInput.mock.mockImplementation((name: string) => {
      if (name === 'phpcs_path') return 'phpcs';
      return '';
    });

    execSyncMock.mock.mockImplementation(() => {
      throw new Error('phpcs failed');
    });

    const result = runOnCompleteFiles(['test.php']);

    assert.strictEqual(result, 1);
    assert.strictEqual(coreMock.setFailed.mock.callCount(), 1);
  });
});
