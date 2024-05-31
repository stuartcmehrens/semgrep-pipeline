export interface AdoPullRequestEvent {
  subscriptionId: string;
  notificationId: number;
  id: string;
  eventType: string;
  publisherId: string;
  message: {
    text: string;
    html: string;
    markdown: string;
  };
  detailedMessage: {
    text: string;
    html: string;
    markdown: string;
  };
  resource: {
    repository: {
      id: string;
      name: string;
      url: string;
      project: {
        id: string;
        name: string;
        url: string;
        state: string;
        revision: number;
        visibility: string;
        lastUpdateTime: string;
      };
      size: number;
      remoteUrl: string;
      sshUrl: string;
      webUrl: string;
      isDisabled: boolean;
      isInMaintenance: boolean;
    };
    pullRequestId: number;
    codeReviewId: number;
    status: string;
    createdBy: {
      displayName: string;
      url: string;
      _links: {
        avatar: {
          href: string;
        };
      };
      id: string;
      uniqueName: string;
      imageUrl: string;
      descriptor: string;
    };
    creationDate: string;
    title: string;
    sourceRefName: string;
    targetRefName: string;
    mergeStatus: string;
    isDraft: boolean;
    mergeId: string;
    lastMergeSourceCommit: {
      commitId: string;
      url: string;
    };
    lastMergeTargetCommit: {
      commitId: string;
      url: string;
    };
    lastMergeCommit: {
      commitId: string;
      author: {
        name: string;
        email: string;
        date: string;
      };
      committer: {
        name: string;
        email: string;
        date: string;
      };
      comment: string;
      url: string;
    };
    reviewers: any[]; // Replace 'any' with the actual type if available
    url: string;
    _links: {
      web: {
        href: string;
      };
      statuses: {
        href: string;
      };
    };
    supportsIterations: boolean;
    artifactId: string;
  };
  resourceVersion: string;
  resourceContainers: {
    collection: {
      id: string;
      baseUrl: string;
    };
    account: {
      id: string;
      baseUrl: string;
    };
    project: {
      id: string;
      baseUrl: string;
    };
  };
  createdDate: string;
}
