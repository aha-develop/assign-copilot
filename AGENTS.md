This is an Aha! extension.

Read about them here https://support.aha.io/aha-develop/support-articles/extensions~7444633425466696974

# Assign Copilot Extension

## Build Commands

```sh
npm install -g aha-cli        # Install CLI (one-time)
npx aha-cli extension:install         # Install extension
npx aha-cli extension:watch           # Dev mode - already running in another terminal
npx aha-cli extension:build           # Build for distribution
```

## Current Approach: REST API Issue-based Assignment

Create a GitHub Issue with assignee `copilot-swe-agent[bot]` and `agent_assignment` in a single REST call. Copilot creates its own branch and PR.

### Flow

1. Create Issue with title, body, assignee, and agent_assignment (single REST call)
2. Copilot creates branch, implements feature, and opens PR

### REST API Endpoint

**POST** `/repos/{owner}/{repo}/issues`

**Headers:**

```
Accept: application/vnd.github+json
Authorization: Bearer {token}
X-GitHub-Api-Version: 2022-11-28
```

**Request Body:**

```json
{
  "title": "APP-123: Feature Name",
  "body": "...",
  "assignees": ["copilot-swe-agent[bot]"],
  "agent_assignment": {
    "target_repo": "owner/repo",
    "base_branch": "main",
    "custom_instructions": "Branch naming and other instructions"
  }
}
```

### Bot Assignee

`copilot-swe-agent[bot]`

## Authentication

### Aha! GitHub Auth

```javascript
const authData = await aha.auth("github", {
  useCachedRetry: true,
  parameters: { scope: "repo, read:org" },
});
```

### Scopes Needed

- Classic PAT: `repo` scope

## Aha! Extension Patterns

### Command Structure

```javascript
aha.on("commandName", ({ record }, { settings }) => {
  // record.referenceNum = "APP-123"
  // record.typename = "Feature" | "Requirement"
  // record.name = "Feature Name"
  // record.description = { htmlValue }
});
```

### Extension Settings (package.json)

```json
"settings": {
  "repository": { "type": "string", "required": true },
  "baseBranch": { "type": "string", "default": "main" },
  "customInstructions": { "type": "string" }
}
```

## Sources

- REST API docs: https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-a-pr#using-the-rest-api
- Aha Extension API: https://support.aha.io/aha-develop/support-articles/extensions/extension-api-reference
- Aha Extension overview: https://support.aha.io/aha-develop/support-articles/extensions~7444633425466696974
