import {
  GitCommitRef,
  GitPullRequest,
} from "azure-devops-node-api/interfaces/GitInterfaces";
import config from "./config";

const {
  connection,
  projectName,
  sourceRepositoryUri,
  pullRequestId,
  sourceCommitId,
  sourceBranch,
  targetBranch,
  pipelineId,
} = config();
const runPipeline = async () => {
  if (!connection) {
    console.error("Connection to Azure DevOps not established.");
    return;
  }

  const pullRequest = await getPullRequest();
  if (!pullRequest) {
    throw new Error(
      `Error getting pull request for pull request ${pullRequestId}.`
    );
  }

  try {
    const pipelinesApi = await connection.getPipelinesApi();
    const pipelineResult = await pipelinesApi.runPipeline(
      {
        previewRun: false,
        templateParameters: {
          projectName: projectName,
          repositoryId: pullRequest.repository.id,
          repositoryName: pullRequest.repository.name,
          repositoryWebUrl: pullRequest.repository.webUrl,
          repositoryRemoteUrl: sourceRepositoryUri,
          pullRequestId: pullRequestId,
          lastMergeCommitId: sourceCommitId,
          lastMergeCommitTargetId: pullRequest.lastMergeTargetCommit.commitId,
          sourceRefName: sourceBranch,
          targetRefName: targetBranch,
        },
      },
      projectName,
      pipelineId
    );

    console.debug(`Pipeline trigger result: ${JSON.stringify(pipelineResult)}`);
  } catch (error) {
    console.error(`Error triggering pipeline: ${error}`);
  }
};

const getPullRequest = async (): Promise<GitPullRequest | undefined> => {
  try {
    const pullRequestApi = await connection.getGitApi();
    const pullRequest = await pullRequestApi.getPullRequestById(
      parseInt(pullRequestId),
      projectName
    );
    return pullRequest;
  } catch (error) {
    console.error(`Error getting pull request: ${error}`);
    return undefined;
  }
};

runPipeline().catch(console.error);
