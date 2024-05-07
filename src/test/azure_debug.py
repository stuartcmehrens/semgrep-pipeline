import sys
sys.path.append('/Users/david/code/azure-devops/semgrep-pipeline/src/')

import json
import util.azure as azure
import re

def parse_embedded_json(large_str):
    # Use regular expression to find the JSON string within HTML comments
    pattern = r"<!--(\{.*?\})-->"
    match = re.search(pattern, large_str)
    
    if match:
        json_str = match.group(1)  # Extract the JSON string from the regex match

        # Parse the JSON string
        try:
            data = json.loads(json_str)
            return data
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON: {e}")
            return None
    else:
        print("No JSON string found in the input.")
        return None


prs = azure.get_prs()
threads = azure.get_comment_threads(prs[0])
comment_data = []

for thread in threads:
    for comment in thread.comments:
        comment_data.append(parse_embedded_json(comment.content))


print(thread)





# # Get a client for identity management (assuming the client supports the required methods)
# identity_client = connection.clients.get_identity_client()

# # Query for the identity details
# identity_guid = 'Build\99bf41a9-343b-4707-baad-0349de5de113'
# identity = identity_client.read_identity(identity_id=identity_guid)

# print(identity)
