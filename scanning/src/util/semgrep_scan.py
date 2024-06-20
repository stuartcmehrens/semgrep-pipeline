import subprocess
import os

from config.settings import DEFAULT_JOB_COUNT, DEFAULT_MAX_MEMORY, SemgrepDiffScanConfig, SemgrepFullScanConfig

semgrep_diff_scan_config = SemgrepDiffScanConfig()
semgrep_full_scan_config = SemgrepFullScanConfig()
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
    print(f"Running DIFF scan for changes on branch {semgrep_diff_scan_config.source_ref_name} at commit {semgrep_diff_scan_config.last_merge_commit_id} from commit {semgrep_diff_scan_config.last_merge_target_commit_id}.")
    print(f"New findings configured to comment/block will post to PRs:")
    print(f"  - {semgrep_diff_scan_config.pull_request_id}")
    docker_command = """
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
            scan_target_path = semgrep_diff_scan_config.scan_target_path,
            output_directory = semgrep_diff_scan_config.output_directory,
            semgrep_app_token = semgrep_diff_scan_config.semgrep_app_token,
            semgrep_repo_display_name = semgrep_diff_scan_config.repository_display_Name,
            semgrep_pr_id = semgrep_diff_scan_config.pull_request_id,
            semgrep_baseline_ref = semgrep_diff_scan_config.last_merge_target_commit_id,
            source_branch = semgrep_diff_scan_config.source_ref_name.split('/')[-1],
            repo_url = semgrep_diff_scan_config.repository_web_url,
            build_id = semgrep_diff_scan_config.build_buildid,
            semgrep_commit = semgrep_diff_scan_config.last_merge_commit_id
        )
    
    semgrep_return_code = run_command(docker_command)
    return semgrep_return_code

def full_scan():
    print(f"Running FULL scan.")
    docker_command = """
        docker run \\
            -v "{scan_target_path}:/src" \\
            -v "{output_directory}:/output" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -e "SEMGREP_REPO_URL={repo_url}" \\
            -i semgrep/semgrep {semgrep_command}
        """.format(
            scan_target_path = semgrep_full_scan_config.scan_target_path,
            output_directory = semgrep_full_scan_config.output_directory,
            semgrep_app_token=semgrep_full_scan_config.semgrep_app_token,
            semgrep_repo_display_name=semgrep_full_scan_config.repository_display_Name,
            repo_url = semgrep_full_scan_config.repository_web_url,
            semgrep_command = _get_full_scan_command()
        )
    
    semgrep_return_code = run_command(docker_command)
    return semgrep_return_code

def _get_full_scan_command():
    semgrep_command = "semgrep ci --json -o /output/semgrep-results.json"
    if (semgrep_full_scan_config.jobs != DEFAULT_JOB_COUNT):
        semgrep_command += f" --jobs {semgrep_full_scan_config.jobs}"
    if (semgrep_full_scan_config.max_memory != DEFAULT_MAX_MEMORY):
        semgrep_command += f" --max-memory {semgrep_full_scan_config.max_memory}"
    if (semgrep_full_scan_config.debug):
        semgrep_command += " --debug"
    if (semgrep_full_scan_config.verbose):
        semgrep_command += " --verbose"

    all_skus = (semgrep_full_scan_config.semgrep_code
                and semgrep_full_scan_config.semgrep_secrets
                and semgrep_full_scan_config.semgrep_supply_chain)
    if not all_skus:
        if semgrep_full_scan_config.semgrep_code:
            semgrep_command += " --code"
        if semgrep_full_scan_config.semgrep_supply_chain:
            semgrep_command += " --supply-chain"
        if semgrep_full_scan_config.semgrep_secrets:
            semgrep_command += " --secrets"

    return semgrep_command