import os
import re
import json

from azure.devops.connection import Connection
from azure.devops.v7_0.git.git_client import GitClient
from azure.devops.v7_0.git.models import GitPullRequestSearchCriteria, GitPullRequestStatus, Comment, CommentThread, CommentThreadContext, CommentPosition
from msrest.authentication import BasicAuthentication

import util.semgrep_finding as futil

# globally scope the boilerplate vars
azure_access_token = os.environ['AZURE_TOKEN'] # of your bot account
organization_url = os.environ['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI']

repo_id = os.environ['BUILD_REPOSITORY_ID']
repo_project_name = re.search(r'azure\.com/[^/]+/([^/]+)/', os.environ['BUILD_REPOSITORY_URI']).group(1)
repo_name = os.environ['BUILD_REPOSITORY_NAME']
repo_branch = os.environ['BUILD_SOURCEBRANCHNAME']
repo_url = re.sub(r"https://.*?@dev\.azure\.com", "https://dev.azure.com", os.environ['BUILD_REPOSITORY_URI'])

pipeline_project_name = os.environ['SYSTEM_TEAMPROJECT'] 
pipeline_url = f"{organization_url}/{pipeline_project_name}/_build/results?buildId={os.environ['BUILD_BUILDID']}"

credentials = BasicAuthentication('', azure_access_token)
connection = Connection(base_url=organization_url, creds=credentials)
git_client = connection.clients.get_git_client()

def add_pr_status(pr, status):
    if status == "pending":
        return git_client.create_pull_request_status(
            status=scan_pending_status(),
            repository_id=repo_id,
            pull_request_id=pr.pull_request_id
        )
    elif status == "completed":
        return git_client.create_pull_request_status(
            status=scan_success_status(),
            repository_id=repo_id,
            pull_request_id=pr.pull_request_id
        )
    elif status == "failed":
        return git_client.create_pull_request_status(
            status=scan_fail_status(),
            repository_id=repo_id,
            pull_request_id=pr.pull_request_id
        )

def add_pr_scan_completed(pr, semgrep_exit_code):
    print(f"Adding PR scan completed status to {pr.code_review_id}")

def scan_pending_status():
    return GitPullRequestStatus(
        state="pending",  # or "failed", "pending"
        description="Semgrep scan is in progress.",
        target_url=pipeline_url,  # URL to the details of the build or status
        context={
            "name": "build",  # Context of the status (e.g., build, CI, approval)
            "genre": "continuous-integration"
        }
    )

def scan_success_status():
    return GitPullRequestStatus(
        state="succeeded",  # or "failed", "succeeded"
        description="Semgrep completed successfully. No blocking findings.",
        target_url=pipeline_url,  # URL to the details of the build or status
        context={
            "name": "build",  # Context of the status (e.g., build, CI, approval)
            "genre": "continuous-integration"
        }
    )

def scan_fail_status():
    return GitPullRequestStatus(
        state="failed",  # or "failed", "succeeded"
        description="Semgrep returned blocking findings. Please review and fix the issues.",
        target_url=pipeline_url,  # URL to the details of the build or status
        context={
            "name": "build",  # Context of the status (e.g., build, CI, approval)
            "genre": "continuous-integration"
        }
    )
        
def get_prs():
    # Prepare search criteria for pull requests
    search_criteria = GitPullRequestSearchCriteria(
        source_ref_name=f'refs/heads/{repo_branch}',
        status='active'
    )

    # List pull requests
    prs = git_client.get_pull_requests_by_project(
        project=repo_project_name,
        search_criteria=search_criteria
    )

    for pr in prs:
        pr.source_branch = pr.source_ref_name.split('/')[-1]
        pr.repository.web_url = repo_url
    return prs

def get_comment_threads(pr):
    return git_client.get_threads(
        repo_id,
        pr.pull_request_id,
        project=repo_project_name
    )

def add_comment(pr):
    print("todo")
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
        pr.pull_request_id,
        project=repo_project_name
    )

def add_inline_comment(pr, finding):
    comment = comment_from_finding(finding)

    thread = CommentThread(
        comments=[Comment(
            content=comment['message'],
            comment_type="text"
        )],
        status=1, # Active
        thread_context=CommentThreadContext(
            file_path=f"/{comment['path']}",
            right_file_start=CommentPosition(
                line=comment['start-line'],
                offset=comment['start-line-col']
            ),
            right_file_end=CommentPosition(
                line=comment['end-line'],
                offset=comment['end-line-col']
            )
        )
    )

    git_client.create_thread(
        thread,
        repo_id,
        pr.pull_request_id,
        project=repo_project_name
    )

def comment_from_finding(finding):
    group_key = futil.group_key(finding, {"name": repo_name})

    return {
        "message": futil.message(finding) + "\n\n<!--" + json.dumps({"group_key": group_key}) + "-->",
        "path": futil.path(finding),
        "start-line": futil.start_line(finding),
        "start-line-col": futil.start_line_col(finding),
        "end-line": futil.end_line(finding),
        "end-line-col": futil.end_line_col(finding),
    }