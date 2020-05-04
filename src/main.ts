import * as core from '@actions/core';
import { getChangedFiles } from './get-changed-file';

async function run(): Promise<void> {
  try {
    const files = await getChangedFiles();
    console.log(files);
    core.info(JSON.stringify(files, null, 2));
    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
