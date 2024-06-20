from typing import Optional
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings

DEFAULT_JOB_COUNT = -1
DEFAULT_MAX_MEMORY = -1
   
class BaseConfig(BaseSettings):
    repository_id: str
    repository_name: str
    pull_request_id: Optional[int] = None
    build_repository_name: str = Field(validation_alias=AliasChoices('BUILD_REPOSITORY_NAME'))
    repository_display_Name: str
    scan_type: str
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

class SemgrepDiffScanConfig(SemgrepScanConfig):
    source_ref_name: Optional[str] = None
    last_merge_commit_id: Optional[str] = None
    last_merge_target_commit_id: Optional[str] = None

class SemgrepFullScanConfig(SemgrepScanConfig):
    jobs: int = DEFAULT_JOB_COUNT
    max_memory: int = DEFAULT_MAX_MEMORY
    debug: bool = False
    verbose: bool = False
    semgrep_code: bool = True
    semgrep_secrets: bool = True
    semgrep_supply_chain: bool = True
    