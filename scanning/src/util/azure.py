import re
import json

from azure.devops.connection import Connection
from azure.devops.v7_0.git.git_client import GitClient
from azure.devops.v7_0.git.models import GitPullRequestSearchCriteria, GitPullRequestStatus, Comment, CommentThread, CommentThreadContext, CommentPosition
from msrest.authentication import BasicAuthentication

from config.settings import AzureDevOpsConfig
import util.semgrep_finding as futil

azure_devops_config = AzureDevOpsConfig()
build_pipeline_url = f"{azure_devops_config.organization_url}/{azure_devops_config.build_pipeline_project_name}/_build/results?buildId={azure_devops_config.build_buildid}"

credentials = BasicAuthentication('', azure_devops_config.azure_token)
connection = Connection(base_url=azure_devops_config.organization_url, creds=credentials)
git_client: GitClient = connection.clients.get_git_client()

def add_pr_status(pull_request_id, status):
    if status == "pending":
        return git_client.create_pull_request_status(
            status=scan_pending_status(),
            repository_id=azure_devops_config.repository_id,
            pull_request_id=pull_request_id
        )
    elif status == "completed":
        return git_client.create_pull_request_status(
            status=scan_success_status(),
            repository_id=azure_devops_config.repository_id,
            pull_request_id=pull_request_id
        )
    elif status == "failed":
        return git_client.create_pull_request_status(
            status=scan_fail_status(),
            repository_id=azure_devops_config.repository_id,
            pull_request_id=pull_request_id
        )

def add_pr_scan_completed(pull_request_id, semgrep_exit_code):
    print(f"Adding PR scan completed status to {pull_request_id}")

def scan_pending_status():
    return GitPullRequestStatus(
        state="pending",  # or "failed", "pending"
        description="Semgrep scan is in progress.",
        target_url=build_pipeline_url,  # URL to the details of the build or status
        context={
            "name": "build",  # Context of the status (e.g., build, CI, approval)
            "genre": "continuous-integration"
        }
    )

def scan_success_status():
    return GitPullRequestStatus(
        state="succeeded",  # or "failed", "succeeded"
        description="Semgrep completed successfully. No blocking findings.",
        target_url=build_pipeline_url,  # URL to the details of the build or status
        context={
            "name": "build",  # Context of the status (e.g., build, CI, approval)
            "genre": "continuous-integration"
        }
    )

def scan_fail_status():
    return GitPullRequestStatus(
        state="failed",  # or "failed", "succeeded"
        description="Semgrep returned blocking findings. Please review and fix the issues.",
        target_url=build_pipeline_url,  # URL to the details of the build or status
        context={
            "name": "build",  # Context of the status (e.g., build, CI, approval)
            "genre": "continuous-integration"
        }
    )

def get_pr(pull_request_id: int, source_ref_name=None, target_ref_name=None):
    pull_requests = get_prs(source_ref_name, target_ref_name)
    for pr in pull_requests:
        if pr.pull_request_id == pull_request_id:
            return pr

    return None
        
def get_prs(source_ref_name=None, target_ref_name=None):
    # Prepare search criteria for pull requests
    search_criteria = GitPullRequestSearchCriteria(
        source_ref_name=source_ref_name,
        target_ref_name=target_ref_name,
    )

    # List pull requests
    return git_client.get_pull_requests_by_project(
        project=azure_devops_config.repository_project_name,
        search_criteria=search_criteria
    )

def get_comment_threads(pull_request_id):
    return git_client.get_threads(
        azure_devops_config.repository_id,
        pull_request_id,
        project=azure_devops_config.repository_project_name
    )

def add_comment(pull_request_id, finding):
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
        azure_devops_config.repository_id,
        pull_request_id,
        project=azure_devops_config.repository_project_name
    )

def add_inline_comment(pull_request_id, finding):
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
        azure_devops_config.repository_id,
        pull_request_id,
        project=azure_devops_config.repository_project_name
    )

def comment_hidden_group_key(finding):
    group_key = futil.group_key(finding, {"name": azure_devops_config.build_repository_name})
    hidden_data = json.dumps({"group_key": group_key})
    return f"\n\n<!--{hidden_data}-->"

def comment_references(finding):
    references = (
        "### References\n" +
        " - [Semgrep Rule](" + futil.semgrep_url(finding) + ")"
    )

    for ref in futil.reference_links(finding):
        references += f"\n - [{ref}]({ref})"

    return references

def comment_summary(finding):
    return (
        f"### Potential {futil.severity(finding)} Severity Risk\n" +
        futil.finding_to_issue_summary(finding) + "\n\n" + 
        futil.message(finding)
    )

def comment_from_finding(finding):
    message = (
        comment_summary(finding) + "\n" +
        comment_references(finding) +
        comment_hidden_group_key(finding)
    )

    return {
        "message": message,
        "path": futil.path(finding),
        "start-line": futil.start_line(finding),
        "start-line-col": futil.start_line_col(finding),
        "end-line": futil.end_line(finding),
        "end-line-col": futil.end_line_col(finding),
    }

def parse_comment_json(comment):
    try:
        pattern = r"<!--(\{.*?\})-->"
        match = re.search(pattern, comment.content)
    
        if match:
            json_str = match.group(1)
            data = json.loads(json_str)
            return data
        else:
            print("No JSON string found in the input.")
            return {}
    except Exception as e:
        print(f"Error parsing comment JSON: {e}")
        print(f"    - Comment: {comment}")
        return {}
    
def get_pr_existing_keys(pr):
    threads = get_comment_threads(pr)
    keys = []

    for thread in threads:
        for comment in thread.comments:
            parsed_content = parse_comment_json(comment)
            if 'group_key' in parsed_content:
                keys.append(parsed_content.get('group_key'))
    
    return keys

def has_existing_comment(pr, finding):
    group_key = futil.group_key(finding, {"name": azure_devops_config.build_repository_name})
    existing_keys = get_pr_existing_keys(pr)
    return group_key in existing_keys