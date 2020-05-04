import { spawn } from 'child_process';
import { once } from 'events';
import * as core from '@actions/core';

/**
 * Executes phpcs on whole files and let's errors to be picked by problem matcher
 * @param files
 */
export async function runOnCompleteFiles(files: string[]): Promise<number> {
  const phpcs = core.getInput('phpcs_path', { required: true });
  const run = spawn(phpcs, ['--report=checkstyle', ...files], {
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  const [code] = await once(run, 'exit');
  console.log('PhpCS exited with code %n', code);
  return code;
}
