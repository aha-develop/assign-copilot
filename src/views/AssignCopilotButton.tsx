import React, { useState } from "react";
import { buildIssue, CopilotIssueData, RecordType } from "../lib/buildIssue";
import { createIssueWithCopilot, getGitHubToken } from "../lib/github";
import { Icon } from "./Icon";

const EXTENSION_ID = "aha-develop.assign-copilot";
const FIELD_NAME = "copilotIssue";

interface AssignCopilotButtonProps {
  record: RecordType;
  settings: {
    repository?: string;
    baseBranch?: string;
    customInstructions?: string;
  };
  existingIssue?: CopilotIssueData;
}

type Status = "idle" | "loading" | "success" | "error" | "existing";

const AssignCopilotButton: React.FC<AssignCopilotButtonProps> = ({
  record,
  settings,
  existingIssue,
}) => {
  const [status, setStatus] = useState<Status>(
    existingIssue ? "existing" : "idle",
  );
  const [message, setMessage] = useState<string>(
    existingIssue ? "Assigned to Copilot." : "",
  );
  const [issueUrl, setIssueUrl] = useState<string>(
    existingIssue?.issueUrl || "",
  );

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("Loading record details...");

    try {
      const repository = settings.repository?.trim();
      if (!repository || !repository.includes("/")) {
        throw new Error(
          "Please configure the repository setting (e.g., owner/repo)",
        );
      }
      const [owner, repo] = repository.split("/");
      const baseBranch = settings.baseBranch?.trim() || "main";
      const customInstructions = settings.customInstructions;

      const { title, body } = await buildIssue(record, customInstructions);

      setMessage("Authenticating with GitHub...");
      const token = await getGitHubToken();

      setMessage("Creating GitHub Issue and assigning Copilot...");

      const issue = await createIssueWithCopilot(token, {
        owner,
        repo,
        title,
        body,
        baseBranch,
        referenceNum: record.referenceNum,
        customInstructions,
      });

      await record.setExtensionField(EXTENSION_ID, FIELD_NAME, {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        assignedAt: new Date().toISOString(),
      } as CopilotIssueData);

      setStatus("success");
      setMessage("GitHub Issue created and assigned to Copilot.");
      setIssueUrl(issue.html_url);
    } catch (error) {
      setStatus("error");
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setMessage(`Error: ${errorMessage}`);
    }
  };

  return (
    <div style={{ padding: "8px 0" }}>
      {status === "idle" && (
        <aha-button kind="secondary" size="small" onClick={handleClick}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "4px",
            }}
          >
            <Icon /> Send to Copilot
          </span>
        </aha-button>
      )}

      {status === "loading" && (
        <aha-alert type="info">
          <aha-spinner slot="icon" /> {message}
        </aha-alert>
      )}

      {(status === "success" || status === "existing") && (
        <aha-alert type={status === "success" ? "success" : "info"}>
          {message}{" "}
          <a href={issueUrl} target="_blank" rel="noopener noreferrer">
            View Issue
          </a>
        </aha-alert>
      )}

      {status === "error" && (
        <aha-alert type="danger">
          {message || "An unexpected error occurred."}{" "}
          <aha-button
            size="small"
            kind="secondary"
            onClick={() => {
              setStatus("idle");
              setMessage("");
            }}
          >
            Try again
          </aha-button>
        </aha-alert>
      )}
    </div>
  );
};

aha.on("assignCopilotButton", ({ record, fields }, { settings }) => {
  console.log(JSON.stringify({ settings, fields, record }, null, 2));
  const typedRecord = record as unknown as RecordType;

  const existingIssue = fields?.[FIELD_NAME] as CopilotIssueData | undefined;

  return (
    <AssignCopilotButton
      record={typedRecord}
      settings={settings as AssignCopilotButtonProps["settings"]}
      existingIssue={existingIssue}
    />
  );
});
