import * as azdev from "azure-devops-node-api";
import * as coreInterfaces from "azure-devops-node-api/interfaces/CoreInterfaces";
import { AdoRepository } from "./interfaces/full-scan-schedule";
import { OverrideConfig } from "./interfaces/full-scan-config";
import { RunResult } from "azure-devops-node-api/interfaces/PipelinesInterfaces";

export class DevOpsClient {
  private readonly _adoApi: azdev.WebApi;
  private readonly _adoOrgUrl: string;
  constructor(adoOrgUrl: string, adoToken: string) {
    const authHandler = azdev.getPersonalAccessTokenHandler(adoToken);
    this._adoApi = new azdev.WebApi(adoOrgUrl, authHandler);
    this._adoOrgUrl = adoOrgUrl;
  }

  async getProjects() {
    const coreApi = await this._adoApi.getCoreApi();
    const projects: coreInterfaces.TeamProjectReference[] = [];
    let projectList = await coreApi.getProjects({ stateFilter: "wellFormed" });
    do {
      projectList.forEach((project) => {
        projects.push(project);
      });
      projectList = await coreApi.getProjects({
        continuationToken: projectList.continuationToken,
      });
    } while (projectList.continuationToken);
    return projects;
  }

  async getRepositories(projectId: string) {
    const gitApi = await this._adoApi.getGitApi();
    const repositories = await gitApi.getRepositories(projectId);
    return repositories;
  }

  async runPipeline(
    repository: AdoRepository,
    pipelineProjectId: string,
    pipelineId: number,
    overrideConfig?: OverrideConfig
  ): Promise<RunResult> {
    const templateParameters = this.mergeConfig(repository, overrideConfig);
    try {
      const pipelinesApi = await this._adoApi.getPipelinesApi();
      const pipelineResult = await pipelinesApi.runPipeline(
        {
          templateParameters: templateParameters,
        },
        pipelineProjectId,
        pipelineId
      );
      pipelineResult.result;
    } catch (error) {
      console.error(
        `Error running pipeline for repository ${repository.name}. Error: ${error}`
      );
      return RunResult.Failed;
    }
  }

  private mergeConfig(
    repository: AdoRepository,
    overrideConfig?: OverrideConfig
  ) {
    const pipelineParameters = {
      repositoryProjectName: repository.adoProject.name,
      repositoryId: repository.id,
      repositoryName: repository.name,
      repositoryWebUrl: repository.webUrl,
      repositoryRemoteUrl: repository.remoteUrl,
      defaultBranch: repository.defaultBranch,
    };
    if (!overrideConfig) {
      return pipelineParameters;
    }

    if (overrideConfig.adoConfig?.defaultBranch)
      pipelineParameters.defaultBranch = overrideConfig.adoConfig.defaultBranch;
    if (overrideConfig.adoConfig?.poolName)
      pipelineParameters["poolName"] = overrideConfig.adoConfig.poolName;
    if (overrideConfig.semgrepConfig?.jobs)
      pipelineParameters["jobs"] = overrideConfig.semgrepConfig.jobs;
    if (overrideConfig.semgrepConfig?.debug)
      pipelineParameters["debug"] = overrideConfig.semgrepConfig.debug;
    if (overrideConfig.semgrepConfig?.verbose)
      pipelineParameters["verbose"] = overrideConfig.semgrepConfig.verbose;
    if (overrideConfig.semgrepConfig?.maxMemory)
      pipelineParameters["maxMemory"] = overrideConfig.semgrepConfig.maxMemory;
    if (overrideConfig.semgrepConfig?.semgrepCode !== undefined)
      pipelineParameters["semgrepCode"] =
        overrideConfig.semgrepConfig.semgrepCode;
    if (overrideConfig.semgrepConfig?.semgrepSecrets !== undefined)
      pipelineParameters["semgrepSecrets"] =
        overrideConfig.semgrepConfig.semgrepSecrets;
    if (overrideConfig.semgrepConfig?.semgrepSupplyChain !== undefined)
      pipelineParameters["semgrepSupplyChain"] =
        overrideConfig.semgrepConfig.semgrepSupplyChain;

    return pipelineParameters;
  }
}
