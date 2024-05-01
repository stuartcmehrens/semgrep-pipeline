import os
from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication

def main():
    # Obtain the necessary variables from environment variables
    organization_url = os.environ['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI']
    project_name = os.environ['SYSTEM_TEAMPROJECT']
    repository_id = os.environ['BUILD_REPOSITORY_ID']
    source_branch = os.environ['BUILD_SOURCEBRANCHNAME']
    personal_access_token = os.environ['SYSTEM_ACCESSTOKEN']

    # Create a connection to Azure DevOps
    credentials = BasicAuthentication('', personal_access_token)
    connection = Connection(base_url=organization_url, creds=credentials)

    # Get a client (the Git client provides access to pull requests)
    git_client = connection.clients.get_git_client()

    # List pull requests
    pull_requests = git_client.get_pull_requests_by_project(
        project_id=project_name,
        search_criteria={
            'sourceRefName': f'refs/heads/{source_branch}',
            'status': 'active'
        }
    )

    # Check if there are any open pull requests for the branch
    if pull_requests:
        print(f"There are {len(pull_requests)} open pull requests for the branch {source_branch}.")
    else:
        print(f"There are no open pull requests for the branch {source_branch}.")

if __name__ == "__main__":
    main()
