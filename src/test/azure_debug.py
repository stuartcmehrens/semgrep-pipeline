import sys
sys.path.append('/Users/david/code/azure-devops/semgrep-pipeline/src/')

import json
import util.azure as azure
import re



prs = azure.get_prs()
keys = azure.get_pr_existing_keys(prs[0])




print(prs)





# # Get a client for identity management (assuming the client supports the required methods)
# identity_client = connection.clients.get_identity_client()

# # Query for the identity details
# identity_guid = 'Build\99bf41a9-343b-4707-baad-0349de5de113'
# identity = identity_client.read_identity(identity_id=identity_guid)

# print(identity)
