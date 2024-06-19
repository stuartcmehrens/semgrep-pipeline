# semgrep-pipeline

This project provides resources for running semgrep scans in Azure DevOps pipelines.

## Project Outline
- [scanning](/scanning/): Contains a python application that runs a semgrep scan, processes results, and posts findings as comments on Pull Requests. The application is meant to be called from an Azure DevOps pipeline within the `pipelines` folder.
- [scan-triggering](/scan-triggering/): Contains `node.js` applications for triggering semgrep scan pipelines:
    - [scan-trigger-function](/scan-triggering/scan-trigger-function/): A `node.js` Azure Function. Deploy this application to Azure Functions and then create a webhook within Azure DevOps to send events to the function. The function then sends a request to the Azure DevOps API to trigger the semgrep scan pipeline.
- [pipelines](/pipelines/): Contains Azure DevOps pipeline definitions for running semgrep scans:
    - [build-validation-trigger](/pipelines/build-validation-trigger/): Contains a [semgrep.yaml](/pipelines/build-validation-trigger/semgrep.yaml) pipeline which is used triggered by build validation policies.
    - [semgrep-scan-az-trigger](/pipelines/semgrep-scan-az-trigger/): Contains a [semgrep.yaml](/pipelines/semgrep-scan-az-trigger/semgrep.yaml) defintion file which runs a semgrep scan. This pipeline is triggered by using Azire DevOps webhooks and the `scan-trigger-function` Azure Function mentioned above.
    - [full-scans](/pipelines/full-scans/): Contains 3 yaml definition files used for scheduling full scans of repositories.
- [cli](/cli/): A `node.js` cli for listing, creating, and deleting webhooks within Azure DevOps. The cli can be run as a docker container.
- [full-scans](/full-scans/): A `node.js` application used for creating a full scan schedule and triggering the full scan pipeline.

## Getting Started

First, start by creating a new repository in Azure DevOps via the `import repository` option referencing [https://github.com/stuartcmehrens/semgrep-pipeline.git](https://github.com/stuartcmehrens/semgrep-pipeline.git) as the repository to import. There are two options for triggering differential scans (scans during Pull Requests) with this repository:

1. Use an Azure Function, an Azure DevOps Webhook to send Pull Request created and updated events to the Azure Function, and an Azure DevOps pipeline that uses the pipeline file located at: [/pipelines/semgrep-scan-az-trigger/semgrep.yaml.](/pipelines/semgrep-scan-az-trigger/semgrep.yaml) The general flow of this option is the following:
    * A Pull Request is created or updated
    * An Azure DevOps Webhook sends the created or updated Pull Request event to an Azure Function
    * The Azure Function uses the Azure DevOps API to trigger a pipeline that runs the semgrep scan
    > **_NOTE:_** This option requires creating two Webhooks in every Azure DevOps project you want to send events from. You can use the CLI tool in [./cli/](/cli/) to create them in an automated fashion.

2. Use an Azure DevOps [build validation policy](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) which targets an Azure DevOps pipeline that uses the pipeline definition located at: [/pipelines/build-validation-trigger/trigger.yaml.](/pipelines/build-validation-trigger/trigger.yaml) The general flow of this option is the following:
    * A Pull Request is created or updated
    * The build validation policy triggers a semgrep scan pipeline
    > **_NOTE:_** This option requires creating build validation policies and pipelines in every Azure DevOps project. This functionality can be added to the CLI tool for scripting purposes if needed.

## Option 1: Azure Function, Webhooks, and Azure DevOps Pipeline (Recommended)

1. After importing the repository, start by [creating a new yaml pipeline](https://learn.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Cbrowser) in Azure DevOps. The pipeline should reference the following file: [/pipelines/semgrep-scan-az-trigger/semgrep.yaml](/pipelines/semgrep-scan-az-trigger/semgrep.yaml)

2. Next, create a Personal Access Token which will be used to authenticate with the Azure DevOps API by the Azure Function for triggering the semgrep scan pipeline created in step 1. The token will also be used by the semgrep scan pipeline for creating Pull Request comments based off of semgrep findings. Additionally, the access token will also be used for Git operations, like cloning repositories to scan.

3. With the PAT created, we need to create a variable group that our pipeline can use. Head to Azure DevOps -> Pipelines -> Library and create a new varibale group called `semgrep-pipeline-vg` with the following values:
    * `AZURE_TOKEN`: the personal access token created in step 2.
    * `SEMGREP_APP_TOKEN`: a semgrep token obtained from semgrep. Follow the steps listed [here](https://semgrep.dev/docs/deployment/add-semgrep-to-ci#add-semgrep-to-ci-1) for creating a new token.
    * `USE_PAT_FOR_GIT_AUTH`: set equal to true to use the PAT created in step 2 to perform authenticated requests via git (recommended). if otherwise, the builtin `$(System.AccessToken)` will be used.

4. Now we'll create and deploy the Azure Function. For a quick start, the easiest way to do this is via VS Code's [Azure Functions extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions). Follow the instructions under the section "Deploy to Azure" for creating and deploying the function. Once the function deployed, we need to create some environment variables:
    * `ORG_URL`: ADO org url. example `https://dev.azure.com/<org_name>`
    * `PERSONAL_ACCESS_TOKEN`: the personal access token created in step 2.
    * `PROJECT_NAME`: the name of the ADO project that holds this repository.
    * `PIPELINE_ID`: the id of the pipeline created in step 1.

5. The Azure Function deployed in step 4 uses `function` level authentication. This means an access key is required to invoke the function. We will need this access key so that our Webhook (which we will create next) can authenticate with the function. This key can be found by going to the Function App in Azure -> Functions: App Keys -> Host keys (all functions) -> default. Make sure to copy the value of the default key and keep it somewhere temporary.

6. The final step is to create Webhooks that can trigger our Azure Function created in step 4. To do this, go the [/cli](/cli/) directory and build the docker image used to run the CLI. With the image built, we can use docker to run our commands needed to create the Webhooks:
```bash
docker run <image:tag> semgrep-azdevops webhooks create \
    -u <ado_org_url> \
    -p <ado_project_name> \
    -t <ado_token> \
    --webhook-url <function_app_url> \
    --function-app-token <function_app_token> \
    --event-type git.pullrequest.created
```
and
```bash
docker run <image:tag> semgrep-azdevops webhooks create \
    -u <ado_org_url> \
    -p <ado_project_name> \
    -t <ado_token> \
    --webhook-url <function_app_url> \
    --function-app-token <function_app_token> \
    --event-type git.pullrequest.updated
```

## Option 2: Use Azure DevOps Build Validation Policies
1. After importing the repository, start by [creating a new yaml pipeline](https://learn.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Cbrowser) in Azure DevOps. The pipeline should reference the following file: [/pipelines/build-validation-trigger/semgrep.yaml](/pipelines/build-validation-trigger/semgrep.yaml).

2. Next, create a Personal Access Token which will be used to authenticate with the Azure DevOps API for creating Pull Request comments based off of semgrep findings. The access token will also be used for Git operations, like cloning repositories to scan.

3. With the PAT created, we need to create a variable group that our pipeline can use. Head to Azure DevOps -> Pipelines -> Library and create a new varibale group called `semgrep-pipeline-vg` with the following values:
    * `AZURE_TOKEN`: the personal access token created in step 2.
    * `SEMGREP_APP_TOKEN`: a semgrep token obtained from semgrep. Follow the steps listed [here](https://semgrep.dev/docs/deployment/add-semgrep-to-ci#add-semgrep-to-ci-1) for creating a new token.
    * `USE_PAT_FOR_GIT_AUTH`: set equal to true to use the PAT created in step 2 to perform authenticated requests via git (recommended). if otherwise, the builtin `$(System.AccessToken)` will be used.

4. Finally, we need to create a build validation policy which will reference the previously created pipeline. Refer to Azure DevOps's documentation [here](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation). Since we want to create the policy at the project level, in Azure DevOps navigate to the following page: Project Settings -> Repos: Repositories -> Policies. When creating the policy, there are two options: 1. Protect the default branch of each repository and 2. Protect current and future branches matching a specified pattern. For getting starting quickly, choose the first option. Under the `Build Validation` section, click `+` to add a new policy. Point the policy to the build pipeline we created previously.

## Full Scans
Full Scans use 3 different pipelines in order to schedule scans across projects and repositories in Azure DevOps. The first pipeline, [/pipelines/full-scans/configuration.yaml](/pipelines/full-scans/configuration.yaml), is responsible for crawling all projects and repositories in Azure DevOps and then creating a schedule which evenly distributes all found repositories accross a 7 day week on an hourly basis. This yaml file is then uploaded as a pipeline artifact, to be used by another pipeline. The configuration pipeline is scheduled to run every hour.

The second pipeline, [/pipelines/full-scans/schedule.yaml](/pipelines/full-scans/schedule.yaml), is resonsbile for scheduling full scans of repositories. When the configuration pipeline completes, it triggers the schedule pipeline to run. The schedule pipeline consumes the pipeline artifact from the configuration pipeline as welll as a [full-scan-config.yaml](/full-scans/configuration/full-scan-config.yaml) file. With these two configuration files, the schedule pipeline determines which repositories are eligible to be scanned and sends a request to the Azure DevOps API to invoke the third and final pipeline, which does the scanning. Scheduling results will be uploaded as an artifact to the schedule pipeline.

The third pipeline, [/pipelines/full-scans/semgrep.yaml](/pipelines/full-scans/semgrep.yaml), is reposible for running a full scan of a repository. The results of full scans will be sent to the semgrep cloud platform.

## Getting Started with Full Scans

1. After importing this repository, [create the following 3 pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops&tabs=java%2Cbrowser) in Azure DevOps:
    * `configuration`: this pipeline should reference the [configuration](/pipelines/full-scans/configuration.yaml) yaml definition file.
    * `schedule`: this pipeline should reference the [schedule](/pipelines/full-scans/schedule.yaml) yaml definition file.
    * `semgrep`: this pipeline should reference the [semgrep](/pipelines/full-scans/semgrep.yaml) yaml definition file.

2. Next, create a Personal Access Token which will be used for Git operations, like cloning repositories to scan as well as sending requests to the Azure DevOps API to trigger the `semgrep` pipeline.
    > **_NOTE:_** if you have already created a PAT while configuring differential scans above, you may skip this step.

3. We need to create an environment variable group that our pipelines will consume named `semgrep-pipeline-vg` with the following values:
    * `AZURE_TOKEN`: the personal access token created in step 2.
    * `SEMGREP_APP_TOKEN`: a semgrep token obtained from semgrep. Follow the steps listed [here](https://semgrep.dev/docs/deployment/add-semgrep-to-ci#add-semgrep-to-ci-1) for creating a new token.
    * `USE_PAT_FOR_GIT_AUTH`: set equal to true to use the PAT created in step 2 to perform authenticated requests via git (recommended). if otherwise, the builtin `$(System.AccessToken)` will be used.
    * `ADO_ORG_URL`: ADO org url. example `https://dev.azure.com/<org_name>`
    * `SCAN_PIPELINE_ID`: The pipeline id of the `semgrep` pipeline created in step 1.
    * `SCAN_PIPELINE_PROJECT_ID`:  The name or id of the Azure DevOps project that contains this repository.
    > **_NOTE:_** if you have already created the variable group when setting up differential scans, you will need the add the `ADO_ORG_URL`, `SCAN_PIPELINE_ID`, and `SCAN_PIPELINE_PROJECT_ID` variables to the existing group.

4. Locate the [full-scan-config.yaml](/full-scans/configuration/full-scan-config.yaml) yaml file and add project and repository ids for scanning. See the `Full Scan Config File` section below for more information.

## Full Scan Config File

The full scan configuration file has the following structure:
```typescript
{
    overrides: [
        {
            repositoryId: string;
            repositoryName: string;
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
            schedule?: {
                utcDay: number | string;
                utcHour: number;
            };
        };
    ];
    includedRepositories?: string | string[];
    excludedRepositories?: string[];
    includedProjects?: string | string[];
    excludedProjects?: string[];
}
```

For a repository to be considered for full scan scheduling, its repository id and its project id need to be added to the `includedRepositories` and `includedProjects` properties, respectively. Special syntax exists for this two properties as well. For example, to include all projects and all repositories, set the following in the yaml file:
```yaml
overrides: []
includedRepositories: '*'
includedProjects: '*'
```

The `excludedRepositories` and `excludedProjects` properties take precedence over their counterparts. For example, if a repository id is in both `includedRepositories` and `excludedRepositories`, the repository will not be scheduled for full scans.

The `overrides` property allows you to override both Azure DevOps and Semgrep behavior on an individual repository basis. It is not a required property. A slight note about override behavior: if a repository id is included in the `overrides` property, its id and project id still need to be included in the `includedRepositories` and `includedProjects` properties.