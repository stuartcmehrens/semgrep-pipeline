export interface FullScanConfig {
  overrides?: OverrideConfig[];
  includedRepositories?: string | string[];
  excludedRepositories?: string[];
  includedProjects?: string | string[];
  excludedProjects?: string[];
}

export interface OverrideConfig {
  repositoryId: string;
  repositoryName: string;
  schedule?: Schedule;
  adoConfig?: {
    poolName?: string;
    defaultBranch?: string;
  };
  semgrepConfig?: {
    jobs?: number;
    debug?: boolean;
    verbose?: boolean;
    maxMemory?: number;
    semgrepCode?: boolean;
    semgrepSecrets?: boolean;
    semgrepSupplyChain?: boolean;
  };
}

export interface FullScanResults {
  results: FullScanResult[];
  startIntervalUTC: string;
  endIntervalUTC: string;
}

export interface Schedule {
  frequency: string;
}

export enum Frequency {
  Daily = "daily",
  Weekly = "weekly",
}

interface FullScanResult {
  repositoryId: string;
  repositoryName: string;
  schedulingResult: number | string;
}
