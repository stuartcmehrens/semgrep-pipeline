import { DevOpsClient } from "../devops-client";

export abstract class CmdBase {
  protected readonly _devOpsClient: DevOpsClient;
  constructor(adoOrgUrl: string, adoToken: string) {
    this._devOpsClient = new DevOpsClient(adoOrgUrl, adoToken);
  }
}
