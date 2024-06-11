import * as azdev from "azure-devops-node-api";

export interface Webhook {
  publisherId: string;
  eventType: string;
  consumerId: string;
  consumerActionId: string;
  publisherInputs:
    | PullRequestCreatedPublisherInputs
    | PullRequestUpdatedPublisherInputs;
  consumerInputs: ConsumerInputs;
  resourceVersion: string;
}

interface PullRequestCreatedPublisherInputs {
  branch?: string;
  projectId: string;
  repository?: string;
  pullrequestReviewersContains?: string;
  pullrequestCreatedByContains?: string;
}

interface PullRequestUpdatedPublisherInputs {
  branch?: string;
  notificationType: string;
  projectId: string;
  repository?: string;
  pullrequestReviewersContains?: string;
  pullrequestCreatedByContains?: string;
}

interface ConsumerInputs {
  url: string;
  httpHeaders?: string;
}

interface IRestResponse<T> {
  statusCode: number;
  result: T | null;
  headers: Object;
}

const apiVersion = "7.2-preview.1";

export class DevOpsClient {
  private readonly _adoApi: azdev.WebApi;
  private readonly _adoOrgUrl: string;
  constructor(adoOrgUrl: string, adoToken: string) {
    const authHandler = azdev.getPersonalAccessTokenHandler(adoToken);
    this._adoApi = new azdev.WebApi(adoOrgUrl, authHandler);
    this._adoOrgUrl = adoOrgUrl;
  }

  async listWebhooks(projectId: string) {
    const { result } = await handleAdoResponse<IRestResponse<any>>(
      this._adoApi.rest.create(
        `${this._adoOrgUrl}/_apis/hooks/subscriptionsQuery?api-version=${apiVersion}`,
        {
          publisherId: "tfs",
          publisherInputFilters: [
            {
              conditions: [
                {
                  inputId: "projectId",
                  inputValue: projectId,
                  operator: "equals",
                },
              ],
            },
          ],
        },
        {
          acceptHeader: "application/json",
          additionalHeaders: {
            "Content-Type": "application/json",
          },
        }
      ),
      (res) => res?.statusCode >= 200 && res?.statusCode < 300
    );

    return result.results;
  }

  async createWebhook(webhook: Webhook) {
    const { result } = await handleAdoResponse<IRestResponse<any>>(
      this._adoApi.rest.create(
        `${this._adoOrgUrl}/_apis/hooks/subscriptions?api-version=${apiVersion}`,
        webhook,
        {
          acceptHeader: "application/json",
          additionalHeaders: {
            "Content-Type": "application/json",
          },
        }
      ),
      (res) => res?.statusCode >= 200 && res?.statusCode < 300
    );

    return result.results;
  }

  async deleteWebhook(subscriptionId: string) {
    const response = await handleAdoResponse<IRestResponse<any>>(
      this._adoApi.rest.del(
        `${this._adoOrgUrl}/_apis/hooks/subscriptions/${subscriptionId}?api-version=${apiVersion}`,
        {
          acceptHeader: "application/json",
        }
      ),
      (res) => res?.statusCode >= 200 && res?.statusCode < 300
    );
  }

  async getProjectId(projectName: string) {
    const coreApi = await handleAdoResponse(this._adoApi.getCoreApi());
    const projects = await handleAdoResponse(coreApi.getProjects("wellFormed"));
    const { id } = projects.find((p) => p.name === projectName);
    return id || undefined;
  }
}

const defaultValidator = (result: any) =>
  result !== undefined || result !== null;

async function handleAdoResponse<T>(
  promise: Promise<T>,
  validator: (result: T) => boolean = defaultValidator
): Promise<T | undefined> {
  try {
    const result = await promise;
    if (validator && !validator(result)) {
      return undefined;
    }
    return result;
  } catch (err) {
    console.error(err);
    return undefined;
  }
}
