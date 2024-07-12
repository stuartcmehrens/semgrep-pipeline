import { OverrideConfig } from "./full-scan-config";

export type FullScanSchedule = { [key: number]: AdoRepository[] };

export interface AdoRepository {
  adoProject: {
    id: string;
    name: string;
  };
  id: string;
  name: string;
  defaultBranch: string;
  webUrl: string;
  remoteUrl: string;
  overrideConfig?: OverrideConfig;
}

export interface AdoProject {
  id: string;
  name: string;
}
