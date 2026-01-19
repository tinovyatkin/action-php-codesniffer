/**
 * Mock fixture for @actions/core module
 * Used with node:test mock.module()
 */
import { mock } from 'node:test';

export const debug = mock.fn<(message: string) => void>();
export const info = mock.fn<(message: string) => void>();
export const warning = mock.fn<(message: string) => void>();
export const error = mock.fn<(message: string) => void>();
export const getInput = mock.fn<(name: string, options?: { required?: boolean }) => string>();
export const setOutput = mock.fn<(name: string, value: string) => void>();
export const setFailed = mock.fn<(message: string | Error) => void>();

export function resetAllMocks(): void {
  debug.mock.resetCalls();
  info.mock.resetCalls();
  warning.mock.resetCalls();
  error.mock.resetCalls();
  getInput.mock.resetCalls();
  setOutput.mock.resetCalls();
  setFailed.mock.resetCalls();
}
