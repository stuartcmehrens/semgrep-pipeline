from azure.devops.connection import Connection
from msrest.authentication import BasicAuthentication
import os

# Configuration for Azure DevOps
organization_url = 'https://dev.azure.com/r2c-david/'
personal_access_token = os.environ['SYSTEM_ACCESSTOKEN']

# Create a connection
credentials = BasicAuthentication('', personal_access_token)
connection = Connection(base_url=organization_url, creds=credentials)

# Get a client for identity management (assuming the client supports the required methods)
identity_client = connection.clients.get_identity_client()

# Query for the identity details
identity_guid = 'Build\99bf41a9-343b-4707-baad-0349de5de113'
identity = identity_client.read_identity(identity_id=identity_guid)

print(identity)
