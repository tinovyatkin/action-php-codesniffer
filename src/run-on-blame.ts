import { lint } from 'php-codesniffer';
// import { blame } from 'git-blame-json';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as Webhooks from '@octokit/webhooks';

export async function runOnBlame(files: string[]) {
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
    console.log(JSON.stringify(payload, null, 2));
    // for (const [file, results] of Object.entries(lintResults.files)) {
    //   const blameMap = await blame(file);
    // }
  } catch (err) {
    core.debug(err);
    core.setFailed(err);
  }
}
