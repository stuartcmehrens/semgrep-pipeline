export type FullScanSchedule = AdoRepository[];

export interface AdoRepository {
  adoProject: {
    id: string;
    name: string;
  };
  schedule: {
    utcDay: number;
    utcHour: number;
  };
  id: string;
  name: string;
  defaultBranch: string;
  webUrl: string;
  remoteUrl: string;
}

export interface AdoProject {
  id: string;
  name: string;
}
