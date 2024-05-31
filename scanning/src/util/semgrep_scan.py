import subprocess
import os

from config.settings import SemgrepScanConfig

semgrep_scan_config = SemgrepScanConfig()
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

def diff_scan():
    semgrep_command = """
        docker run \\
            -v "{scan_target_path}:/src" \\
            -v "{output_directory}:/output" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -e "SEMGREP_PR_ID={semgrep_pr_id}" \\
            -e "SEMGREP_BASELINE_REF={semgrep_baseline_ref}" \\
            -e "SEMGREP_BRANCH={source_branch}" \\
            -e "SEMGREP_REPO_URL={repo_url}" \\
            -e "BUILD_BUILDID={build_id}" \\
            -e "SEMGREP_COMMIT={semgrep_commit}" \\
            -i semgrep/semgrep semgrep ci --json -o /output/semgrep-results.json --verbose
        """.format(
            scan_target_path = semgrep_scan_config.scan_target_path,
            output_directory = semgrep_scan_config.output_directory,
            semgrep_app_token = semgrep_scan_config.semgrep_app_token,
            semgrep_repo_display_name = semgrep_scan_config.repository_display_Name,
            semgrep_pr_id = semgrep_scan_config.pull_request_id,
            semgrep_baseline_ref = semgrep_scan_config.last_merge_target_commit_id,
            source_branch = semgrep_scan_config.source_ref_name.split('/')[-1],
            repo_url = semgrep_scan_config.repository_web_url,
            build_id = semgrep_scan_config.build_buildid,
            semgrep_commit = semgrep_scan_config.last_merge_commit_id
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
            semgrep_app_token=semgrep_scan_config.semgrep_app_token,
            semgrep_repo_display_name=semgrep_scan_config.repository_display_Name
        )
    
    semgrep_return_code = run_command(semgrep_command)
    return semgrep_return_code