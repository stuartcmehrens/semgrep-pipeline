import os
import subprocess
import sys

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

    if pull_requests:
        pr = pull_requests[0]

        print(f"There are {len(pull_requests)} open pull requests for the branch {pr.source_branch}.")
        print(f"Running PR scan associated with the first PR: {pr.code_review_id}")
        
        pr_pending_status = azure.add_pr_status_pending(pr)
        semgrep_exit_code = semgrep.diff_scan(pr)
        pr_ending_status = azure.add_pr_scan_completed(pr, semgrep_exit_code)

    else:
        print(f"There are no open pull requests for the branch {pr.source_branch}.")
        print(f"Running FULL scan.")
        semgrep_exit_code = semgrep.full_scan()


if __name__ == "__main__":
    main()
