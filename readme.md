# semgrep-pipeline

This project provides resources for running semgrep scans in Azure DevOps pipelines.

## Project Outline
- `scanning`: Contains a python application that runs a semgrep scan, processes results, and posts findings as comments on Pull Requests. The application is meant to be called from an Azure DevOps pipeline within the `pipelines` folder.
- `scan-triggering`: Contains `node.js` applications for triggering semgrep scan pipelines:
    - `build-validation-trigger`: A `node.js` application which can be called from a pipeline. The application makes a call to the Azure DevOps API to trigger the semgrep scan pipeline.
    - `scan-trigger-function`: A `node.js` Azure Function. Deploy this application to Azure Functions and then create a webhook within Azure DevOps to send events to the function. The function then sends a request to the Azure DevOps API to trigger the semgrep scan pipeline.
- `pipelines`: Contains Azure DevOps pipeline definitions for running semgrep scans:
    - `build-validation-trigger`: Contains two pipeline yaml definition files. `trigger.yaml` uses the `build-validation-trigger` application mentioned above to trigger the `semgrep.yaml` pipeline.
    - `semgrep-scan-az-trigger`: Contains a `semgrep.yaml` defintion file which runs a semgrep scan. This pipeline is triggered by using Azire DevOps webhooks and the `scan-trigger-function` Azure Function mentioned above.
- `cli`: A `node.js` cli for listing, creating, and deleting webhooks within Azure DevOps. The cli can be run as a docker container.
