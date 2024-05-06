import subprocess
import os

def run_command(command):
    # Start the subprocess
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    # Read one line at a time as it becomes available
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print(output.strip())
    
    # Wait for the subprocess to finish and get the exit code
    rc = process.poll()
    return rc

def diff_scan(pr):
    source_branch = pr.source_ref_name.split('/')[-1]
    semgrep_command = """
        docker run \\
            -v "./repo:/src" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -e "SEMGREP_PR_ID={semgrep_pr_id}" \\
            -e "SEMGREP_BASELINE_REF={semgrep_baseline_ref}" \\
            -e "SEMGREP_BRANCH={source_branch}" \\
            -e "SEMGREP_REPO_URL={repo_url}" \\
            -i semgrep/semgrep semgrep ci --json -o semgrep-results.json
        """.format(
            semgrep_app_token = os.environ['SEMGREP_APP_TOKEN'],
            semgrep_repo_display_name = os.environ['REPO_DISPLAY_NAME'],
            semgrep_pr_id = pr.code_review_id,
            semgrep_baseline_ref = pr.last_merge_target_commit.commit_id,
            source_branch = source_branch,
            repo_url = pr.repository.web_url
        )
    
    semgrep_return_code = run_command(semgrep_command)
    return semgrep_return_code

def full_scan():
    semgrep_command = """
        docker run \\
            -v "./repo:/src" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -i semgrep/semgrep semgrep ci --json -o semgrep-results.json
        """.format(
            semgrep_app_token=os.environ['SEMGREP_APP_TOKEN'],
            semgrep_repo_display_name=os.environ['REPO_DISPLAY_NAME']
        )
    
    semgrep_return_code = run_command(semgrep_command)
    return semgrep_return_code