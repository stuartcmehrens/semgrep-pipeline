import os
import sys
import json

import azure_util as azure
import semgrep_util as semgrep

def log_start():
    print(f"------------------------------------------------------------------------------")
    print(f"Running semgrep on {os.environ['BUILD_REPOSITORY_NAME']} from {os.environ['BUILD_REPOSITORY_URI']}")
    print(f"Repository Display Name: {os.environ['REPO_DISPLAY_NAME']}")
    print(f"------------------------------------------------------------------------------")

def main():
    log_start()
    pull_requests = azure.get_prs()
    semgrep_exit_code = 0

    if pull_requests:
        pr = pull_requests[0]

        print(f"There are {len(pull_requests)} open pull requests for the branch {pr.source_branch}.")
        print(f"Running PR scan associated with the first PR: {pr.code_review_id}")
        
        pr_pending_status = azure.add_pr_status(pr, "pending")
        semgrep_exit_code = semgrep.diff_scan(pr)
        if (semgrep_exit_code == 0):
            pr_ending_status = azure.add_pr_status(pr, "completed")
        else:
            pr_ending_status = azure.add_pr_status(pr, "failed")

        with open('./repo/semgrep-results.json') as f:
            semgrep_results = json.load(f)
            for finding in semgrep_results['results']:
                print(finding)
                azure.add_inline_comment(pr,{
                    "message": finding['extra']['message'],
                    "path": finding['path'],
                    "line-start": finding['start']['line'],
                    "line-start-offset": finding['start']['col'],
                    "line-end": finding['end']['line'],
                    "line-end-offset": finding['end']['col'],
                })
        
    else:
        print(f"There are no open pull requests for the branch {pr.source_branch}.")
        print(f"Running FULL scan.")
        semgrep_exit_code = semgrep.full_scan()



    sys.exit(semgrep_exit_code)

if __name__ == "__main__":
    main()
