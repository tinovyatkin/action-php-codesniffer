import * as core from '@actions/core';
import { getChangedFiles } from './get-changed-file';

async function run(): Promise<void> {
  try {
    const files = await getChangedFiles();
    core.info(JSON.stringify(files, null, 2));
    if (!files.added.length && !files.modified.length) {
      core.warning('No files to check, exiting...');
      return;
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
