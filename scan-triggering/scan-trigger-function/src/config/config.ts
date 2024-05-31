import * as azdev from "azure-devops-node-api";

export default () => {
  const orgUrl = process.env.ORG_URL || "";
  const token = process.env.PERSONAL_ACCESS_TOKEN || "";

  let connection: azdev.WebApi | undefined;
  try {
    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    connection = new azdev.WebApi(orgUrl, authHandler);
  } catch (error) {
    console.error(`Error creating connection to Azure DevOps: ${error}`);
  }
  return {
    projectName: process.env.PROJECT_NAME || "default-project",
    pipelineId: parseInt(process.env.PIPELINE_ID) || 0,
    connection,
  };
};
