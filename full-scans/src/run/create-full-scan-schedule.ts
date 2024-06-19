import { GitRepository } from "azure-devops-node-api/interfaces/GitInterfaces";
import * as fs from "fs/promises";
import * as yaml from "yaml";
import config from "../config";
import { DevOpsClient } from "../devops-client";
import { FullScanSchedule } from "../interfaces/full-scan-schedule";

const { adoOrgUrl, adoToken, scheduleProducer } = config();
const devOpsClient = new DevOpsClient(adoOrgUrl, adoToken);
const run = async () => {
  const projects = await devOpsClient.getProjects();
  const repositories: GitRepository[] = [];
  for (const project of projects) {
    const projectRepositories = await devOpsClient.getRepositories(project.id);
    repositories.push(...projectRepositories);
  }

  if (repositories.length === 0) {
    console.info("No repositories found. exiting.");
    return;
  }

  const schedule = createFullScanSchedule(repositories);
  await fs.writeFile(
    scheduleProducer.scheduleOutputPath,
    yaml.stringify(schedule)
  );
};

// attempts to evenly distrubute repositories across a 7 day week hourly.
const createFullScanSchedule = (repositories: GitRepository[]) => {
  const schedule: FullScanSchedule = [];
  for (let i = 0; i < repositories.length; i++) {
    const scheduleDay = i % 7;
    const scheduleHour = Math.floor(i / 7) % 24;
    const repository = repositories[i];
    schedule.push({
      adoProject: {
        id: repository.project.id,
        name: repository.project.name,
      },
      schedule: {
        utcDay: scheduleDay,
        utcHour: scheduleHour,
      },
      id: repository.id,
      name: repository.name,
      webUrl: repository.webUrl,
      remoteUrl: repository.remoteUrl,
      defaultBranch: repository.defaultBranch,
    });
  }

  return schedule;
};

run().catch(console.error);
