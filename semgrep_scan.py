import os
import subprocess
import sys
from azure.devops.connection import Connection
from azure.devops.v7_0.git.git_client import GitClient
from azure.devops.v7_0.git.models import GitPullRequestSearchCriteria, GitPullRequestStatus, Comment, CommentThread
from msrest.authentication import BasicAuthentication

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

def scan_pending_status(build_url):
    return GitPullRequestStatus(
        state="pending",  # or "failed", "pending"
        description="Semgrep scan is in progress",
        target_url=build_url,  # URL to the details of the build or status
        context={
            "name": "build",  # Context of the status (e.g., build, CI, approval)
            "genre": "continuous-integration"
        }
    )

def main():
    # Obtain the necessary variables from environment variables
    organization_url = os.environ['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI']
    project_name = os.environ['BUILD_REPOSITORY_NAME']
    source_branch = os.environ['BUILD_SOURCEBRANCHNAME']
    system_access_token = os.environ['SYSTEM_ACCESSTOKEN']
    repo_id = os.environ['BUILD_REPOSITORY_ID']
    build_url = f"{organization_url}/{project_name}/_build/results?buildId={os.environ['BUILD_BUILDID']}"

    # Create a connection to Azure DevOps
    credentials = BasicAuthentication('', system_access_token)
    connection = Connection(base_url=organization_url, creds=credentials)

    # Get a client (the Git client provides access to pull requests)
    git_client = connection.clients.get_git_client()

    # Prepare search criteria for pull requests
    search_criteria = GitPullRequestSearchCriteria(
        source_ref_name=f'refs/heads/{source_branch}',
        status='active'
    )

    # List pull requests
    pull_requests = git_client.get_pull_requests_by_project(
        project=project_name,
        search_criteria=search_criteria
    )

    print(f"------------------------------------------------------------------------------")
    print(f"Running semgrep on {os.environ['BUILD_REPOSITORY_NAME']} from {os.environ['BUILD_REPOSITORY_URI']}")
    print(f"Repository Display Name: {os.environ['REPO_DISPLAY_NAME']}")
    print(f"------------------------------------------------------------------------------")

    # Check if there are any open pull requests for the branch
    if pull_requests:
        print(f"There are {len(pull_requests)} open pull requests for the branch {source_branch}.")
        print(f"Running PR scan associated with the first PR: {pull_requests[0].code_review_id}")

        thread = CommentThread(
            comments=[Comment(
                content="Semgrep scan is in progress",
                comment_type="system"
            )],
            status=1 # Active
        )

        git_client.create_thread(
            thread,
            repo_id,
            pull_requests[0].pull_request_id,
            project=project_name
        )

        status = git_client.create_pull_request_status(
            status=scan_pending_status(build_url),
            repository_id=repo_id,
            pull_request_id=pull_requests[0].pull_request_id
        )

        semgrep_command = """
        docker run \\
            -v "./repo:/src" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -e "SEMGREP_PR_ID={semgrep_pr_id}" \\
            -e "SEMGREP_BASELINE_REF={semgrep_baseline_ref}" \\
            -e "SEMGREP_BRANCH={source_branch}" \\
            -i semgrep/semgrep semgrep ci --json -o semgrep-results.json
        """.format(
            semgrep_app_token=os.environ['SEMGREP_APP_TOKEN'],
            semgrep_repo_display_name=os.environ['REPO_DISPLAY_NAME'],
            semgrep_pr_id=pull_requests[0].code_review_id,
            semgrep_baseline_ref=pull_requests[0].last_merge_target_commit.commit_id,
            source_branch=source_branch
        )

        sys.exit(run_command(semgrep_command))

    else:
        print(f"There are no open pull requests for the branch {source_branch}.")
        print(f"Running FULL scan.")
        semgrep_command = """
        docker run \\
            -v "./repo:/src" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -i semgrep/semgrep semgrep ci --json -o semgrep-results.json
        """.format(
            semgrep_app_token=os.environ['SEMGREP_APP_TOKEN'],
            semgrep_repo_display_name=os.environ['REPO_DISPLAY_NAME'],
            semgrep_pr_id=pull_requests[0].code_review_id
        )

        sys.exit(run_command(semgrep_command))

if __name__ == "__main__":
    main()
