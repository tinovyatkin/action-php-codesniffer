import { execSync } from 'child_process';
import * as core from '@actions/core';

/**
 * Executes phpcs on whole files and let's errors to be picked by problem matcher
 * @param files
 */
export async function runOnCompleteFiles(files: string[]): Promise<number> {
  const phpcs = core.getInput('phpcs_path', { required: true });
  const args = ['--report=checkstyle'];
  const standard = core.getInput('standard');
  if (standard) args.push(`--standard=${standard}`);

  try {
    execSync(`${phpcs} ${args.join(' ')} ${files.join(' ')}`, {
      stdio: 'inherit',
      timeout: 20000,
    });
    console.log('PhpCS exited with code 0');
    return 0;
  } catch (err) {
    console.error(err);
    return 1;
  }
}
