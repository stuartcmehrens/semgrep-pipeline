import { GitRepository } from "azure-devops-node-api/interfaces/GitInterfaces";
import * as fs from "fs/promises";
import * as yaml from "yaml";
import config from "../config";
import { DevOpsClient } from "../devops-client";
import { FullScanSchedule } from "../interfaces/full-scan-schedule";
import * as randu from "@stdlib/random/base/randu";
import { SECONDS_IN_DAY, SECONDS_IN_WEEK } from "@stdlib/constants/time";
import { createHash } from "crypto";
import {
  Frequency,
  FullScanConfig,
  Schedule,
} from "../interfaces/full-scan-config";

const { adoOrgUrl, adoToken, scheduleProducer } = config();
const devOpsClient = new DevOpsClient(adoOrgUrl, adoToken);
const run = async () => {
  const now = new Date();
  const repositories = await getRepositories();
  if (repositories.length === 0) {
    console.info("No repositories found. exiting.");
    return;
  }

  console.info("Creating full scan schedule.");
  const schedule = await createFullScanSchedule(repositories, now);
  await fs.writeFile(
    scheduleProducer.scheduleOutputPath,
    yaml.stringify(schedule)
  );
};

const getRepositories = async (): Promise<GitRepository[]> => {
  const projects = await devOpsClient.getProjects();
  const repositories: GitRepository[] = [];
  for (const project of projects) {
    const projectRepositories = await devOpsClient.getRepositories(project.id);
    repositories.push(...projectRepositories);
  }
  return repositories;
};

const createFullScanSchedule = async (
  repositories: GitRepository[],
  now: Date
) => {
  const schedule: FullScanSchedule = {};
  const fullScanConfig = await getFullScanConfig();
  const mostRecentSundayUTCSeconds = getMostRecentSundayUTCMilliseconds(now);
  for (let i = 0; i < repositories.length; i++) {
    const repository = repositories[i];
    if (!isRepositoryIncluded(repository, fullScanConfig)) {
      continue;
    }

    const overrideConfig = fullScanConfig.overrides?.find(
      (config) => config.repositoryId === repository.id
    );
    const scheduleDateUTCMilliseconds = getUTCScheduleDateForRepository(
      repository.id,
      mostRecentSundayUTCSeconds,
      overrideConfig?.schedule
    );
    if (!schedule[scheduleDateUTCMilliseconds]) {
      schedule[scheduleDateUTCMilliseconds] = [];
    }

    console.log(
      `Scheduling repository ${repository.name} in project ${
        repository.project.name
      } for full scan at ${new Date(
        scheduleDateUTCMilliseconds
      ).toUTCString()}.`
    );
    schedule[scheduleDateUTCMilliseconds].push({
      adoProject: {
        id: repository.project.id,
        name: repository.project.name,
      },
      id: repository.id,
      name: repository.name,
      webUrl: repository.webUrl,
      remoteUrl: repository.remoteUrl,
      defaultBranch: repository.defaultBranch,
      overrideConfig: overrideConfig,
    });
  }

  return schedule;
};

const getUTCScheduleDateForRepository = (
  repositoryId: string,
  mostRecentSundayUTCMilliseconds: number,
  overrideSchedule?: Schedule
) => {
  const seed = stringToSeed(repositoryId);
  const generator = randu.factory({ seed });
  if (overrideSchedule?.frequency === Frequency.Daily) {
    console.log(`overriding schedule for repository ${repositoryId} to daily.`);
    const now = new Date();
    const todayAtMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const randomSeconds = Math.floor(generator() * SECONDS_IN_DAY);
    return todayAtMidnight.getDate() + randomSeconds;
  }

  const randomSeconds = Math.floor(generator() * SECONDS_IN_WEEK);
  return mostRecentSundayUTCMilliseconds + randomSeconds * 1000;
};

const stringToSeed = (str: string): number => {
  const hash = createHash("sha256").update(str).digest("hex");
  return parseInt(hash.slice(0, 8), 16);
};

const getMostRecentSundayUTCMilliseconds = (now: Date): number => {
  const currentDay = now.getUTCDay();
  const daysSinceSunday = currentDay === 0 ? 0 : currentDay;
  const mostRecentSunday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceSunday
    )
  );

  const mostRecentSundayUTCMilliseconds = mostRecentSunday.getTime();
  console.log(
    `most recent sunday: ${new Date(
      mostRecentSundayUTCMilliseconds
    ).toUTCString()}`
  );
  return mostRecentSundayUTCMilliseconds;
};

const getFullScanConfig = async () => {
  const fullScanConfigStr = await fs.readFile(
    scheduleProducer.fullScanConfigPath,
    "utf-8"
  );
  const fullScanConfig = yaml.parse(fullScanConfigStr) as FullScanConfig;
  return fullScanConfig;
};

const isRepositoryIncluded = (
  repository: GitRepository,
  fullScanConfig: FullScanConfig
) => {
  if (fullScanConfig.excludedProjects?.includes(repository.project.id)) {
    console.log(
      `excluding repository ${repository.name} in project ${repository.project.name} because of project exclusion rule.`
    );
    return false;
  }

  if (
    fullScanConfig.includedProjects === "*" ||
    (Array.isArray(fullScanConfig.includedProjects) &&
      fullScanConfig.includedProjects.includes(repository.project.id))
  ) {
    return includeRepositoryFilter(repository, fullScanConfig);
  } else {
    console.log(
      `excluding repository ${repository.name} in project ${repository.project.name} because of project inclusion rule.`
    );
    return false;
  }
};

const includeRepositoryFilter = (
  repository: GitRepository,
  fullScanConfig: FullScanConfig
) => {
  if (fullScanConfig.excludedRepositories?.includes(repository.id)) {
    console.log(
      `excluding repository ${repository.name} in project ${repository.project.name} because of repository exclusion rule.`
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
      `excluding repository ${repository.name} in project ${repository.project.name} because of repository inclusion rule.`
    );
    return false;
  }
};

run().catch(console.error);
