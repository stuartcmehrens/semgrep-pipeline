# semgrep-pipeline

This project provides resources for running semgrep scans in Azure DevOps pipelines.

## Project Outline
- [scanning](/scanning/): Contains a python application that runs a semgrep scan, processes results, and posts findings as comments on Pull Requests. The application is meant to be called from an Azure DevOps pipeline within the `pipelines` folder.
- [scan-triggering](/scan-triggering/): Contains `node.js` applications for triggering semgrep scan pipelines:
    - [scan-trigger-function](/scan-triggering/scan-trigger-function/): A `node.js` Azure Function. Deploy this application to Azure Functions and then create a webhook within Azure DevOps to send events to the function. The function then sends a request to the Azure DevOps API to trigger the semgrep scan pipeline.
- [pipelines](/pipelines/): Contains Azure DevOps pipeline definitions for running semgrep scans:
    - [build-validation-trigger](/pipelines/build-validation-trigger/): Contains a [semgrep.yaml](/pipelines/build-validation-trigger/semgrep.yaml) pipeline which is used triggered by build validation policies.
    - [semgrep-scan-az-trigger](/pipelines/semgrep-scan-az-trigger/): Contains a [semgrep.yaml](/pipelines/semgrep-scan-az-trigger/semgrep.yaml) defintion file which runs a semgrep scan. This pipeline is triggered by using Azire DevOps webhooks and the `scan-trigger-function` Azure Function mentioned above.
- [cli](/cli/): A `node.js` cli for listing, creating, and deleting webhooks within Azure DevOps. The cli can be run as a docker container.

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
    --u <ado_org_url> \
    -p <ado_project_name> \
    -t <ado_token> \
    --webhook-url <function_app_url> \
    --function-app-token <function_app_token> \
    --event-type git.pullrequest.created
```
and
```bash
docker run <image:tag> semgrep-azdevops webhooks create \
    --u <ado_org_url> \
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