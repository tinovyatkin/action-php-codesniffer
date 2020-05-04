import * as path from 'path';
import * as core from '@actions/core';
import { getChangedFiles } from './get-changed-file';
import { runOnCompleteFiles } from './run-on-files';
import { runOnBlame } from './run-on-blame';

async function run(): Promise<void> {
  try {
    const files = await getChangedFiles();
    core.info(JSON.stringify(files, null, 2));
    if (!files.added.length && !files.modified.length) {
      core.warning('No files to check, exiting...');
      return;
    }

    /**
     * Adding problem matcher to annotate files without token
     * @see {@link https://github.com/actions/setup-node/blob/a47b2f66c61e623b503818d97a63ce0fe087f700/src/setup-node.ts#L36}
     */
    const matchersPath = path.join(__dirname, '..', '.github');
    console.log(
      `##[add-matcher]${path.join(matchersPath, 'phpcs-matcher.json')}`
    );

    // run on complete files when they added or scope=files
    const scope = core.getInput('scope', { required: true });
    if (files.added.length || scope === 'files')
      runOnCompleteFiles(
        scope === 'files' ? [...files.added, ...files.modified] : files.added
      );
    else if (files.modified.length && scope === 'blame') {
      // run on blame
      await runOnBlame(files.modified);
    }
  } catch (error) {
    core.setFailed(error);
  }
}

run();
