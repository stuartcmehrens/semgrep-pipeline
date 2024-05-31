import * as azdev from "azure-devops-node-api";
import * as dotenv from "dotenv";

dotenv.config();
export default () => {
  const token = process.env.AZURE_TOKEN || "";
  const orgUrl = process.env.ORG_URL || "";
  let connection: azdev.WebApi | undefined;
  try {
    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    connection = new azdev.WebApi(orgUrl, authHandler);
  } catch (error) {
    console.error(`Error creating connection to Azure DevOps API: ${error}`);
  }
  return {
    connection: connection,
    projectName: process.env.PROJECT_NAME || "",
    pipelineId: parseInt(process.env.PIPELINE_ID) || undefined,
    sourceRepositoryUri: process.env.SOURCE_REPOSITORY_URI || "",
    pullRequestId: process.env.PULL_REQUEST_ID || "",
    sourceCommitId: process.env.SOURCE_COMMIT_ID || "",
    sourceBranch: process.env.SOURCE_BRANCH || "",
    targetBranch: process.env.TARGET_BRANCH || "",
  };
};
