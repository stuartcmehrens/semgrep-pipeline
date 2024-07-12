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
    pipelineId: number
  ): Promise<RunResult> {
    const templateParameters = this.mergeConfig(repository);
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

  private mergeConfig(repository: AdoRepository) {
    const pipelineParameters = {
      repositoryProjectName: repository.adoProject.name,
      repositoryId: repository.id,
      repositoryName: repository.name,
      repositoryWebUrl: repository.webUrl,
      repositoryRemoteUrl: repository.remoteUrl,
      defaultBranch: repository.defaultBranch,
    };
    if (!repository.overrideConfig) {
      return pipelineParameters;
    }

    if (repository.overrideConfig.adoConfig?.defaultBranch)
      pipelineParameters.defaultBranch =
        repository.overrideConfig.adoConfig.defaultBranch;
    if (repository.overrideConfig.adoConfig?.poolName)
      pipelineParameters["poolName"] =
        repository.overrideConfig.adoConfig.poolName;
    if (repository.overrideConfig.semgrepConfig?.jobs)
      pipelineParameters["jobs"] = repository.overrideConfig.semgrepConfig.jobs;
    if (repository.overrideConfig.semgrepConfig?.debug)
      pipelineParameters["debug"] =
        repository.overrideConfig.semgrepConfig.debug;
    if (repository.overrideConfig.semgrepConfig?.verbose)
      pipelineParameters["verbose"] =
        repository.overrideConfig.semgrepConfig.verbose;
    if (repository.overrideConfig.semgrepConfig?.maxMemory)
      pipelineParameters["maxMemory"] =
        repository.overrideConfig.semgrepConfig.maxMemory;
    if (repository.overrideConfig.semgrepConfig?.semgrepCode !== undefined)
      pipelineParameters["semgrepCode"] =
        repository.overrideConfig.semgrepConfig.semgrepCode;
    if (repository.overrideConfig.semgrepConfig?.semgrepSecrets !== undefined)
      pipelineParameters["semgrepSecrets"] =
        repository.overrideConfig.semgrepConfig.semgrepSecrets;
    if (
      repository.overrideConfig.semgrepConfig?.semgrepSupplyChain !== undefined
    )
      pipelineParameters["semgrepSupplyChain"] =
        repository.overrideConfig.semgrepConfig.semgrepSupplyChain;

    return pipelineParameters;
  }
}
