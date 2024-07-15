import sys
import json

from config.settings import BaseConfig
import util.azure as azure
import util.semgrep_scan as semgrep
import util.semgrep_finding as futil

config = BaseConfig()
def log_start():
    print(f"------------------------------------------------------------------------------")
    print(f"Running semgrep on {config.repository_name} from {config.build_repository_name}")
    print(f"Repository Display Name: {config.repository_display_Name}")
    print(f"------------------------------------------------------------------------------")

def main():
    log_start()
    semgrep_exit_code = 0

    # check if there's still an active PR at the time of firing. there's a chance that the PR was closed before the pipeline runs
    # an edge case exists if someone opens a PR, the pipeline runs, and then the PR is closed before the pipeline finishes
    pull_request = azure.get_pr(config.pull_request_id)
    if pull_request is not None and config.scan_type == "diff":
        pr_pending_status = azure.add_pr_status(config.pull_request_id, "pending")
        semgrep_exit_code = semgrep.diff_scan()
        if (semgrep_exit_code == 0):
            pr_ending_status = azure.add_pr_status(config.pull_request_id, "completed")
        else:
            pr_ending_status = azure.add_pr_status(config.pull_request_id, "failed")

        if (config.enable_pr_comments):
            try:
                with open('./semgrep-results.json') as f:
                    semgrep_results = json.load(f)
                    for finding in semgrep_results['results']:
                        if futil.is_commentable(finding) and not azure.has_existing_comment(config.pull_request_id, finding):
                            print(f"Posting to PR #{config.pull_request_id} comment for new finding: {finding}")
                            azure.add_inline_comment(config.pull_request_id, finding)   
            except FileNotFoundError:
                print(f"Semgrep results file not found. No comments will be posted to the PR.")
    elif config.scan_type == "full":
        semgrep_exit_code = semgrep.full_scan()
    else:
        print(f"Invalid scan type: {config.scan_type}")
        sys.exit(1)

    sys.exit(semgrep_exit_code)

if __name__ == "__main__":
    main()
