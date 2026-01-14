import { buildIssue, CopilotIssueData, RecordType } from "../lib/buildIssue";
import { createIssueWithCopilot, getGitHubToken } from "../lib/github";

const EXTENSION_ID = "aha.assign-copilot";
const FIELD_NAME = "copilotIssue";

aha.on("assignCopilot", async ({ record }, { settings }) => {
  try {
    if (!record || !["Feature", "Requirement"].includes(record.typename)) {
      aha.commandOutput(
        "Error: Please run this command on a Feature or Requirement"
      );
      return;
    }

    const typedRecord = record as unknown as RecordType;
    const existing = (await typedRecord.getExtensionField(
      EXTENSION_ID,
      FIELD_NAME
    )) as CopilotIssueData | null;
    if (existing) {
      aha.commandOutput(`Already assigned to Copilot: ${existing.issueUrl}`);
      return;
    }

    const repository = settings.repository as string;
    if (!repository || !repository.includes("/")) {
      aha.commandOutput(
        "Error: Please configure the repository setting (e.g., owner/repo)"
      );
      return;
    }
    const [owner, repo] = repository.split("/");
    const baseBranch = (settings.baseBranch as string) || "main";
    const customInstructions = settings.customInstructions as
      | string
      | undefined;

    aha.commandOutput("Authenticating with GitHub...");
    const token = await getGitHubToken();

    const { title, body } = await buildIssue(typedRecord, customInstructions);

    aha.commandOutput("Creating GitHub Issue and assigning Copilot...");
    const issue = await createIssueWithCopilot(token, {
      owner,
      repo,
      title,
      body,
      baseBranch,
      referenceNum: typedRecord.referenceNum,
      customInstructions,
    });

    await typedRecord.setExtensionField(EXTENSION_ID, FIELD_NAME, {
      issueNumber: issue.number,
      issueUrl: issue.html_url,
      assignedAt: new Date().toISOString(),
    } as CopilotIssueData);

    aha.commandOutput(
      `✓ Copilot assigned to Issue: ${issue.html_url}\n\nCopilot will create a PR when it starts working on this task.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    aha.commandOutput(`Error: ${message}`);
  }
});
