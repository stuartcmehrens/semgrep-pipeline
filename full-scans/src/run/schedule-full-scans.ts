import config from "../config";
import * as fs from "fs/promises";
import * as yaml from "yaml";
import { DevOpsClient } from "../devops-client";
import {
  AdoRepository,
  FullScanSchedule,
} from "../interfaces/full-scan-schedule";
import {
  FullScanConfig,
  FullScanResults,
} from "../interfaces/full-scan-config";
import { setTimeout } from "timers/promises";

const { adoOrgUrl, adoToken, scheduleConsumer } = config();
const devOpsClient = new DevOpsClient(adoOrgUrl, adoToken);
const run = async () => {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const utcHour = now.getUTCHours();
  const fullScanSchedule = await getFullScanSchedule();
  const fullScanConfig = await getFullScanConfig();

  const repositoryScheduleOverrides = filterScheduleOverrides(
    fullScanConfig,
    utcDay,
    utcHour
  );
  const batch = fullScanSchedule.filter((repository) => {
    return (
      (repository.schedule.utcDay === utcDay &&
        repository.schedule.utcHour === utcHour &&
        !repositoryScheduleOverrides.repositoryIdsNotIncluded.includes(
          repository.id
        )) ||
      repositoryScheduleOverrides.repositoryIdsIncluded.includes(repository.id)
    );
  });
  const fullScanResults: FullScanResults = {
    results: [],
    scheduleDay: utcDay,
  };
  if (batch.length === 0) {
    console.log(
      `No repositories scheduled for this time slot '${now.toUTCString()}'. Exiting.`
    );
    await writeFullScanResults(fullScanResults);
    return;
  }

  for (const repository of batch) {
    console.log(`Attempting to schedule full scan for ${repository.name}`);
    if (!repositoryIsIncluded(repository, fullScanConfig)) {
      fullScanResults.results.push({
        repositoryId: repository.id,
        repositoryName: repository.name,
        schedulingResult: "excluded",
      });
      continue;
    }

    const scheduleResult = await devOpsClient.runPipeline(
      repository,
      scheduleConsumer.scanPipelineProjectId,
      scheduleConsumer.scanPipelineId,
      fullScanConfig.overrides?.find(
        (config) => config.repositoryId === repository.id
      )
    );
    fullScanResults.results.push({
      repositoryId: repository.id,
      repositoryName: repository.name,
      schedulingResult: scheduleResult ?? "successful",
    });

    await setTimeout(1000);
  }

  await writeFullScanResults(fullScanResults);
};

const filterScheduleOverrides = (
  fullScanConfig: FullScanConfig,
  utcDay: number,
  utcHour: number
) => {
  const repositoryScheduleOverrides: {
    repositoryIdsIncluded: string[];
    repositoryIdsNotIncluded: string[];
  } = {
    repositoryIdsIncluded: [],
    repositoryIdsNotIncluded: [],
  };

  fullScanConfig.overrides?.forEach((override) => {
    if (
      (override.schedule?.utcDay === utcDay ||
        override.schedule?.utcDay === "*") &&
      override.schedule?.utcHour === utcHour
    ) {
      repositoryScheduleOverrides.repositoryIdsIncluded.push(
        override.repositoryId
      );
    } else {
      repositoryScheduleOverrides.repositoryIdsNotIncluded.push(
        override.repositoryId
      );
    }
  });

  return repositoryScheduleOverrides;
};

const includeRepositoryFilter = (
  repository: AdoRepository,
  fullScanConfig: FullScanConfig
) => {
  if (fullScanConfig.excludedRepositories?.includes(repository.id)) {
    console.log(
      `excluding repository ${repository.name} in project ${repository.adoProject.name} because of repository exclusion rule.`
    );
    return false;
  }

  if (
    fullScanConfig.includedRepositories === "*" ||
    (Array.isArray(fullScanConfig.includedRepositories) &&
      fullScanConfig.includedRepositories?.includes(repository.id))
  ) {
    return true;
  } else {
    console.log(
      `excluding repository ${repository.name} in project ${repository.adoProject.name} because of repository inclusion rule.`
    );
    return false;
  }
};

const repositoryIsIncluded = (
  repository: AdoRepository,
  fullScanConfig: FullScanConfig
) => {
  if (fullScanConfig.excludedProjects?.includes(repository.adoProject.id)) {
    console.log(
      `excluding repository ${repository.name} in project ${repository.adoProject.name} because of project exclusion rule.`
    );
    return false;
  }

  if (
    fullScanConfig.includedProjects === "*" ||
    (Array.isArray(fullScanConfig.includedProjects) &&
      fullScanConfig.includedProjects.includes(repository.adoProject.id))
  ) {
    return includeRepositoryFilter(repository, fullScanConfig);
  } else {
    console.log(
      `excluding repository ${repository.name} in project ${repository.adoProject.name} because of project inclusion rule.`
    );
    return false;
  }
};

const getFullScanSchedule = async () => {
  const adoConfigStr = await fs.readFile(
    scheduleConsumer.fullScanSchedulePath,
    "utf-8"
  );
  const adoConfig = yaml.parse(adoConfigStr) as FullScanSchedule;
  return adoConfig;
};

const getFullScanConfig = async () => {
  const fullScanConfigStr = await fs.readFile(
    scheduleConsumer.fullScanConfigPath,
    "utf-8"
  );
  const fullScanConfig = yaml.parse(fullScanConfigStr) as FullScanConfig;
  return fullScanConfig;
};

const writeFullScanResults = async (fullScanResults: FullScanResults) => {
  await fs.writeFile(
    scheduleConsumer.fullScanResultsOutputPath,
    yaml.stringify(fullScanResults)
  );
};

run().catch(console.error);
