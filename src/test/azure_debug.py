import sys
sys.path.append('/Users/david/code/azure-devops/semgrep-pipeline/src/')

import json
import util.azure as azure
import re



prs = azure.get_prs()
pr = prs[0]
# keys = azure.get_pr_existing_keys(prs[0])

with open('/Users/david/code/azure-devops/semgrep-pipeline/src/test/data/findings-r1pr1.json') as f:
    semgrep_results = json.load(f)
    for finding in semgrep_results['results']:
        if not azure.has_existing_comment(pr, finding):
            print(f"Posting to PR #{pr.code_review_id} comment for new finding: {finding}")
            azure.add_inline_comment(pr, finding)  

print(prs)



