import os
import sys
import json

import util.azure as azure
import util.semgrep_scan as semgrep
import util.semgrep_finding as futil

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
        print(f"Running DIFF scan for changes on branch {pull_requests[0].source_branch} from commit {pull_requests[0].last_merge_target_commit.commit_id}.")
        print(f"New findings configured to comment/block will post to PRs:")
        for pr in pull_requests:
            print(f"  - {pr.code_review_id}")
            pr_pending_status = azure.add_pr_status(pr, "pending")

        semgrep_exit_code = semgrep.diff_scan(pull_requests[0])

        for pr in pull_requests:
            if (semgrep_exit_code == 0):
                pr_ending_status = azure.add_pr_status(pr, "completed")
            else:
                pr_ending_status = azure.add_pr_status(pr, "failed")

            with open('./repo/semgrep-results.json') as f:
                semgrep_results = json.load(f)
                for finding in semgrep_results['results']:
                    if (azure.has_existing_comment(pr, finding)):
                        print(f"Posting to PR #{pr.code_review_id} comment for new finding: {finding}")
                        azure.add_inline_comment(pr, finding)  
        
    else:
        print(f"There are no open pull requests for the branch.")
        print(f"Running FULL scan.")
        semgrep_exit_code = semgrep.full_scan()

    sys.exit(semgrep_exit_code)

if __name__ == "__main__":
    main()
