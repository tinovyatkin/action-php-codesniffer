import { lint } from 'php-codesniffer';
import { execFileSync } from 'child_process';
import { blame } from 'git-blame-json';
import * as path from 'path';
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
      ['--no-pager', 'log', '--format=%ae', `${github.context.sha}^!`],
      { encoding: 'utf8', windowsHide: true, timeout: 5000 }
    ).trim();
    console.log('PR author email: %s', authorEmail);
    for (const [file, results] of Object.entries(lintResults.files)) {
      const blameMap = await blame(file);
      let headerPrinted = false;
      for (const message of results.messages) {
        if (blameMap.get(message.line)?.authorMail === authorEmail) {
          // that's our line
          // we simulate checkstyle output to be picked up by problem matched
          if (!headerPrinted) {
            console.log(`<file name="${path.relative(process.cwd(), file)}">`);
            headerPrinted = true;
          }
          // output the problem
          console.log(
            '<error line="%d" column="%d" severity="%s" message="%s" source="%s"/>',
            message.line,
            message.column,
            message.type.toLowerCase(),
            message.message,
            message.source
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
