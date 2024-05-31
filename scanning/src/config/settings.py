from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings
   
class BaseConfig(BaseSettings):
    pull_request_id: int
    repository_id: str
    repository_name: str
    build_repository_name: str = Field(validation_alias=AliasChoices('BUILD_REPOSITORY_NAME'))
    repository_display_Name: str
    scan_type: str
    source_ref_name: str
    last_merge_commit_id: str
    last_merge_target_commit_id: str
    build_buildid: int = Field(validation_alias=AliasChoices('BUILD_BUILDID'))

class AzureDevOpsConfig(BaseConfig):
    azure_token: str
    organization_url: str = Field(validation_alias=AliasChoices('SYSTEM_TEAMFOUNDATIONSERVERURI'))
    repository_project_name: str
    build_repository_id: str = Field(validation_alias=AliasChoices('BUILD_REPOSITORY_ID'))
    build_pipeline_project_name: str = Field(validation_alias=AliasChoices('SYSTEM_TEAMPROJECT'))

class SemgrepScanConfig(BaseConfig):
    semgrep_app_token: str
    scan_target_path: str
    repository_web_url: str
    output_directory: str
