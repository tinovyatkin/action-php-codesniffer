import { lint } from 'php-codesniffer';
import { execFileSync } from 'child_process';
import { blame } from 'git-blame-json';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as Webhooks from '@octokit/webhooks';

export async function runOnBlame(files: string[]): Promise<void> {
  try {
    const options: Record<string, string> = {};
    const standard = core.getInput('standard');
    if (standard) options.standard = standard;

    const lintResults = await lint(
      files,
      core.getInput('phpcs_path', { required: true })
    );

    const dontFailOnWarning =
      core.getInput('fail_on_warnings') == 'false' ||
      core.getInput('fail_on_warnings') === 'off';
    if (!lintResults.totals.errors) {
      if (dontFailOnWarning) return;
      if (!lintResults.totals.warnings) return;
    }

    // blame files and output relevant errors
    const payload = github.context
      .payload as Webhooks.WebhookPayloadPullRequest;
    // get email of author of first commit in PR
    const authorEmail = execFileSync(
      'git',
      [
        '--no-pager',
        'log',
        "--format='%ae'",
        `${payload.pull_request.base.sha}^!`,
      ],
      { encoding: 'utf8', windowsHide: true, timeout: 5000 }
    ).trim();
    console.log('PR author email: %s', authorEmail);
    for (const [file, results] of Object.entries(lintResults.files)) {
      const blameMap = await blame(file);
      console.log(blameMap);
      console.log(results);
      let headerPrinted = false;
      for (const message of results.message) {
        if (blameMap.get(message.line)?.authorEmail === authorEmail) {
          // that's our line
          // we simulate checkstyle output to be picked up by problem matched
          if (!headerPrinted) {
            console.log(`<file name="${file}">`);
            headerPrinted = true;
          }
          // output the problem
          console[message.type === 'ERROR' ? 'error' : 'warn'](
            `<error line="${message.line}" column="${
              message.column
            }" severity="${message.type.toLowerCase()}" message="${
              message.message
            }" source="${message.source}"/>`
          );
          // fail
          if (message.type === 'WARNING' && !dontFailOnWarning)
            core.setFailed(message.message);
          else if (message.type === 'ERROR') core.setFailed(message.message);
        }
      }
    }
  } catch (err) {
    core.debug(err);
    core.setFailed(err);
  }
}
