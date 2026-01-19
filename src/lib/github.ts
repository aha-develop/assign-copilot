const GITHUB_API = "https://api.github.com";

interface IssueResponse {
  node_id: string;
  html_url: string;
  number: number;
}

interface CreateIssueOptions {
  owner: string;
  repo: string;
  title: string;
  body: string;
  baseBranch: string;
  referenceNum: string;
  customInstructions?: string;
}

async function getGitHubToken(): Promise<string> {
  const authData = await aha.auth("github", {
    useCachedRetry: true,
    parameters: { scope: "repo, read:org" },
  });
  return authData.token;
}

async function restRequest<T>(
  token: string,
  method: string,
  endpoint: string,
  body: unknown = null,
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${GITHUB_API}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `GitHub API error: ${response.status}`);
  }
  return data;
}

async function createIssueWithCopilot(
  token: string,
  options: CreateIssueOptions,
): Promise<IssueResponse> {
  const {
    owner,
    repo,
    title,
    body,
    baseBranch,
    referenceNum,
    customInstructions,
  } = options;

  // Build custom instructions with branch naming requirement
  const branchInstruction = `IMPORTANT - Branch and PR Naming Requirement:
You MUST include ${referenceNum} in the branch name.
You MUST include ${referenceNum} in the PR title.
The reference "${referenceNum}" is required for tracking.`;

  const fullInstructions = customInstructions
    ? `${branchInstruction}\n\n${customInstructions}`
    : branchInstruction;

  return restRequest<IssueResponse>(
    token,
    "POST",
    `/repos/${owner}/${repo}/issues`,
    {
      title,
      body,
      assignees: ["copilot-swe-agent[bot]"],
      agent_assignment: {
        target_repo: `${owner}/${repo}`,
        base_branch: baseBranch,
        custom_instructions: fullInstructions,
      },
    },
  );
}

export {
  getGitHubToken,
  createIssueWithCopilot,
  IssueResponse,
  CreateIssueOptions,
};
