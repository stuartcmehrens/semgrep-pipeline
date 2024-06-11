import { Webhook } from "../devops-client";
import { CmdBase } from "./cmd-base";

export class WebhookCommands extends CmdBase {
  constructor(adoOrgUrl: string, adoToken: string) {
    super(adoOrgUrl, adoToken);
  }

  async listWebhooks(projectName: string) {
    const projectId = await this._devOpsClient.getProjectId(projectName);
    const subscriptions = await this._devOpsClient.listWebhooks(projectId);
    return subscriptions;
  }

  async createWebhook(
    projectName: string,
    eventType: string,
    url: string,
    functionAppToken?: string
  ) {
    const projectId = await this._devOpsClient.getProjectId(projectName);
    const webhookBody = this.getWebhookBody(
      projectId,
      eventType,
      url,
      functionAppToken
    );
    await this._devOpsClient.createWebhook(webhookBody);
  }

  async deleteWebhook(subscriptionIds: string[]) {
    subscriptionIds.forEach(async (subscriptionId) => {
      await this._devOpsClient.deleteWebhook(subscriptionId);
    });
  }

  private getWebhookBody(
    projectId: string,
    eventType: string,
    url: string,
    functionAppToken?: string
  ) {
    const webhookBody: Webhook =
      eventType === "git.pullrequest.created"
        ? {
            publisherId: "tfs",
            eventType: eventType,
            consumerActionId: "httpRequest",
            consumerId: "webHooks",
            publisherInputs: {
              projectId: projectId,
            },
            consumerInputs: {
              url: url,
            },
            resourceVersion: "1.0",
          }
        : {
            publisherId: "tfs",
            eventType: eventType,
            consumerActionId: "httpRequest",
            consumerId: "webHooks",
            publisherInputs: {
              projectId: projectId,
              notificationType: "PushNotification",
            },
            consumerInputs: {
              url: url,
            },
            resourceVersion: "1.0",
          };
    if (functionAppToken) {
      webhookBody.consumerInputs.httpHeaders = `x-functions-key": ${functionAppToken}`;
    }
    return webhookBody;
  }
}
