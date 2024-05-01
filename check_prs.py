import os
from azure.devops.connection import Connection
from azure.devops.v7_0.git.git_client import GitClient
from azure.devops.v7_0.git.models import GitPullRequestSearchCriteria
from msrest.authentication import BasicAuthentication

def main():
    # Obtain the necessary variables from environment variables
    organization_url = os.environ['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI']
    project_name = os.environ['BUILD_REPOSITORY_NAME']
    source_branch = os.environ['BUILD_SOURCEBRANCHNAME']
    system_access_token = os.environ['SYSTEM_ACCESSTOKEN']

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
        semgrep_command = """
        docker run \\
            -v "./repo:/src" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -e "SEMGREP_PR_ID={semgrep_pr_id}" \\
            -i semgrep/semgrep semgrep ci
        """.format(
            semgrep_app_token=os.environ['SEMGREP_APP_TOKEN'],
            semgrep_repo_display_name=os.environ['REPO_DISPLAY_NAME'],
            semgrep_pr_id=pull_requests[0].code_review_id
        )
    else:
        print(f"There are no open pull requests for the branch {source_branch}.")
        print(f"Running FULL scan.")
        semgrep_command = """
        docker run \\
            -v "./repo:/src" \\
            -e "SEMGREP_APP_TOKEN={semgrep_app_token}" \\
            -e "SEMGREP_REPO_DISPLAY_NAME={semgrep_repo_display_name}" \\
            -i semgrep/semgrep semgrep ci
        """.format(
            semgrep_app_token=os.environ['SEMGREP_APP_TOKEN'],
            semgrep_repo_display_name=os.environ['REPO_DISPLAY_NAME'],
            semgrep_pr_id=pull_requests[0].code_review_id
        )

if __name__ == "__main__":
    main()