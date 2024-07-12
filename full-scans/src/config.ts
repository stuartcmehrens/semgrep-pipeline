import * as dotenv from "dotenv";

dotenv.config();
export default () => {
  return {
    adoOrgUrl: process.env.ADO_ORG_URL,
    adoToken: process.env.AZURE_TOKEN,
    scheduleProducer: {
      scheduleOutputPath: process.env.SCHEDULE_OUTPUT_PATH,
      fullScanConfigPath: process.env.FULL_SCAN_CONFIG_PATH,
    },
    scheduleConsumer: {
      fullScanSchedulePath: process.env.FULL_SCAN_SCHEDULE_PATH,
      fullScanResultsOutputPath: process.env.FULL_SCAN_RESULTS_OUTPUT_PATH,
      scanPipelineProjectId: process.env.SCAN_PIPELINE_PROJECT_ID,
      scanPipelineId: parseInt(process.env.SCAN_PIPELINE_ID),
      intervalInMinutes: parseInt(process.env.INTERVAL_IN_MINUTES),
    },
  };
};
