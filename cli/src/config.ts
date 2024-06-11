import * as dotenv from "dotenv";

dotenv.config();
export const config = {
  adoOrgUrl: process.env.ADO_ORG_URL,
  adoProjectName: process.env.ADO_PROJECT,
  adoToken: process.env.ADO_PERSONAL_ACCESS_TOKEN,
  semgrepRepoName: process.env.SEMGREP_REPO_NAME,
  semgrepPipelineName: process.env.SEMGREP_PIPELINE_NAME,
  semgrepPolicyDisplayName: process.env.SEMGREP_POLICY_DISPLAY_NAME,
};
