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
  schedule?: {
    utcDay: number | string;
    utcHour: number;
  };
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
  scheduleDay: number;
}

interface FullScanResult {
  repositoryId: string;
  repositoryName: string;
  schedulingResult: number | string;
}
