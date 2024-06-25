# Semgrep SAST Scan Report Generator

## Overview

This project is adapted from the following repository: [Semgrep SAST Scan Report Generator](https://github.com/r2c-CSE/semgrep_findings_to_csv_html_pdf_all_repos_filter_tag). Please see that repository's [README](https://github.com/r2c-CSE/semgrep_findings_to_csv_html_pdf_all_repos_filter_tag/blob/main/README.md) for more information on usage.

## Getting Started

To get started generating reports, create a new pipeline in Azure DevOps that references the pipeline definition file [/pipelines/reporting/report.yaml](/pipelines/reporting/report.yaml). This pipeline runs every Sunday at 12 AM and generates reports of findings that are on the semgrep.dev platform. In order to use this pipeline, configure the following:

1. Create a new variable group called `semgrep-pipeline-vg`. If you have already configured differential or full scans using this repository, it's likely this variable group already exists.

2. Create an API token with the `Web API` permission on semgrep.dev. Please see the API documentation [here](https://semgrep.dev/api/v1/docs/#section/Authentication) for more information on creating a token. Be sure to save the token's secret somewhere temprarory as we will need is in the next step.

3. In the variable group created in step 1, we need two values: 
    * `REPORTING_TAG`: this controls which projects will get reports generated for them and corresponds a tag on projects on semgrep.dev. Please see our documentation on tagging projects [here](https://semgrep.dev/docs/semgrep-appsec-platform/tags). An appropriate tag for projects that you want to include in report generation could be something like `reporting`.
    * `SEMGREP_API_WEB_TOKEN`: this corresponds to the value of the token created in step 2.

Reports will be uploaded as an artifact of the pipeline, which can then be downloaded later on.