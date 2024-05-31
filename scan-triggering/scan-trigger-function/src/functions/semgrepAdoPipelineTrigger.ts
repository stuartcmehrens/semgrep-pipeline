import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { AdoPullRequestEvent } from "../interfaces/pullrequest-event";
import config from "../config/config";

const { pipelineId, projectName, connection } = config();
export async function semgrepAdoPipelineTrigger(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);
  const adoPullRequestEvent = await validateWebhookRequest(request, context);
  if (!adoPullRequestEvent) {
    return { status: 202 };
  }

  context.debug(`Received event: ${JSON.stringify(adoPullRequestEvent)}`);
  if (!connection) {
    context.error("Connection to Azure DevOps not established.");
    return { status: 202 };
  }
  try {
    const pipelinesApi = await connection.getPipelinesApi();
    const pipelineRequestBody = {
      previewRun: false,
      templateParameters: {
        eventType: adoPullRequestEvent.eventType,
        repositoryProjectName:
          adoPullRequestEvent.resource.repository.project.name,
        repositoryId: adoPullRequestEvent.resource.repository.id,
        repositoryName: adoPullRequestEvent.resource.repository.name,
        repositoryWebUrl: adoPullRequestEvent.resource.repository.webUrl,
        repositoryRemoteUrl: adoPullRequestEvent.resource.repository.remoteUrl,
        pullRequestId: `${adoPullRequestEvent.resource.pullRequestId}`,
        lastMergeCommitId:
          adoPullRequestEvent.resource.lastMergeCommit.commitId,
        lastMergeTargetCommitId:
          adoPullRequestEvent.resource.lastMergeTargetCommit.commitId,
        sourceRefName: adoPullRequestEvent.resource.sourceRefName,
        targetRefName: adoPullRequestEvent.resource.targetRefName,
      },
    };
    context.debug(
      `Sending request to Azure DevOps. Pipeline request body: ${JSON.stringify(
        pipelineRequestBody
      )}`
    );
    const pipelineResult = await pipelinesApi.runPipeline(
      pipelineRequestBody,
      projectName,
      pipelineId
    );

    context.debug(`Pipeline trigger result: ${JSON.stringify(pipelineResult)}`);
    return { status: 202 };
  } catch (error) {
    // instead of returning a 500 status code, log the error and return a 202 status code
    // this prevents DevOps from possibly disabling the webhook
    // we may want to optionally notify the team that the pipeline failed to trigger
    console.error("Failed to trigger pipeline: ", error);
    return { status: 202 };
  }
}

const validateWebhookRequest = async (
  request: HttpRequest,
  context: InvocationContext
): Promise<AdoPullRequestEvent> => {
  let adoPullRequestEvent: AdoPullRequestEvent;
  try {
    adoPullRequestEvent = (await request.json()) as AdoPullRequestEvent;
  } catch (error) {
    context.error(`Failed to parse request body: ${error}`);
    return undefined;
  }

  if (!adoPullRequestEvent) {
    context.error("Failed to parse request body.");
    return undefined;
  }

  if (
    (adoPullRequestEvent.eventType != "git.pullrequest.created" &&
      adoPullRequestEvent.eventType != "git.pullrequest.updated") ||
    adoPullRequestEvent.resource.status != "active"
  ) {
    context.info(
      `Ignoring event type ${adoPullRequestEvent.eventType}. Only 'git.pullrequest.created' and 'git.pullrequest.updated' with statuses set to 'active' are supported.`
    );
    return undefined;
  }

  return adoPullRequestEvent;
};

app.http("semgrepAdoPipelineTrigger", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: semgrepAdoPipelineTrigger,
});
