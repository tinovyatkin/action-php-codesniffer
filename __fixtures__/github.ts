/**
 * Mock fixture for @actions/github module
 * Used with node:test mock.module()
 */

export const context = {
  payload: {
    pull_request: {
      base: {
        sha: 'abc123base',
      },
      head: {
        sha: 'def456head',
      },
    },
  },
  sha: 'def456head',
};

export function setPayload(payload: typeof context.payload): void {
  context.payload = payload;
}

export function resetContext(): void {
  context.payload = {
    pull_request: {
      base: {
        sha: 'abc123base',
      },
      head: {
        sha: 'def456head',
      },
    },
  };
  context.sha = 'def456head';
}
