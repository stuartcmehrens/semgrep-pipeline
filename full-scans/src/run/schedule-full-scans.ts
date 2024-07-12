import config from "../config";
import * as fs from "fs/promises";
import * as yaml from "yaml";
import { DevOpsClient } from "../devops-client";
import {
  AdoRepository,
  FullScanSchedule,
} from "../interfaces/full-scan-schedule";
import { FullScanResults } from "../interfaces/full-scan-config";
import { setTimeout } from "timers/promises";

const { adoOrgUrl, adoToken, scheduleConsumer } = config();
const devOpsClient = new DevOpsClient(adoOrgUrl, adoToken);
const now = new Date();
const run = async () => {
  const fullScanSchedule = await getFullScanSchedule();
  const startIntervalUTCMilliseconds = getPreviousIntervalUTCMilliseconds(
    scheduleConsumer.intervalInMinutes
  );
  const endIntervalUTCMilliseconds =
    startIntervalUTCMilliseconds + 60 * scheduleConsumer.intervalInMinutes;

  const batch: AdoRepository[] = [];
  for (const key in fullScanSchedule) {
    const scheduleTimeInUTCMilliseconds = parseInt(key);
    if (
      scheduleTimeInUTCMilliseconds >= startIntervalUTCMilliseconds &&
      scheduleTimeInUTCMilliseconds < endIntervalUTCMilliseconds
    ) {
      batch.push(...fullScanSchedule[key]);
    }
  }

  const fullScanResults: FullScanResults = {
    results: [],
    startIntervalUTC: new Date(startIntervalUTCMilliseconds).toISOString(),
    endIntervalUTC: new Date(endIntervalUTCMilliseconds).toISOString(),
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
    const scheduleResult = await devOpsClient.runPipeline(
      repository,
      scheduleConsumer.scanPipelineProjectId,
      scheduleConsumer.scanPipelineId
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

const getPreviousIntervalUTCMilliseconds = (
  intervalMinutes: number
): number => {
  const now = new Date();
  const minutes = now.getMinutes();
  const remainder = minutes % intervalMinutes;
  now.setMinutes(minutes - remainder - intervalMinutes, 0, 0);
  return now.getDate();
};

const getFullScanSchedule = async () => {
  const adoConfigStr = await fs.readFile(
    scheduleConsumer.fullScanSchedulePath,
    "utf-8"
  );
  const adoConfig = yaml.parse(adoConfigStr) as FullScanSchedule;
  return adoConfig;
};

const writeFullScanResults = async (fullScanResults: FullScanResults) => {
  await fs.writeFile(
    scheduleConsumer.fullScanResultsOutputPath,
    yaml.stringify(fullScanResults)
  );
};

run().catch(console.error);
