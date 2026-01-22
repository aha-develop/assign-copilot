import React, { useState } from "react";
import { buildIssue, CopilotIssueData, RecordType } from "../lib/buildIssue";
import { createIssueWithCopilot, getGitHubToken } from "../lib/github";
import { Icon } from "./Icon";
import { SendToAI } from "./SendToAI";

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

type Status =
  | "not-configured"
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "existing";

const AssignCopilotButton: React.FC<AssignCopilotButtonProps> = ({
  record,
  settings,
  existingIssue,
}) => {
  const hasSettings = !!settings?.repository;

  const [status, setStatus] = useState<Status>(
    existingIssue ? "existing" : hasSettings ? "idle" : "not-configured",
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

    console.log("wha?");

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
    <>
      {(status === "idle" ||
        status === "error" ||
        status === "not-configured") && (
        <SendToAI
          label={`Build with Copilot`}
          icon={<Icon />}
          button={
            status === "not-configured" ? (
              <aha-button
                kind="secondary"
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  window.open("/develop/settings/account/extensions");
                }}
              >
                Configure Copilot <i className="fa-regular fa-gear"></i>
              </aha-button>
            ) : (
              <aha-button kind="secondary" size="small" onClick={handleClick}>
                Send to Copilot <i className="fa-regular fa-arrow-right"></i>
              </aha-button>
            )
          }
          footer={`Share this ${record.typename.toLowerCase()} with Copilot to begin implementation.`}
          alert={
            status === "error" ? (
              <aha-alert type="danger" size="mini">
                {message}
              </aha-alert>
            ) : null
          }
        />
      )}

      {status === "loading" && (
        <SendToAI
          label="Sending to Copilot..."
          icon={<Icon />}
          button={
            <aha-button
              kind="secondary"
              size="small"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              <span>
                Creating issue
                <aha-spinner style={{ marginLeft: "6px" }} size="10px" />
              </span>
            </aha-button>
          }
          footer={message}
        />
      )}

      {(status === "success" || status === "existing") && (
        <>
          <SendToAI
            label="Assigned to Copilot"
            icon={<Icon />}
            button={
              <aha-button
                kind="secondary"
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(issueUrl, "_blank", "noopener noreferrer");
                }}
              >
                View Session
                <i className="fa-regular fa-arrow-up-right" />
              </aha-button>
            }
            alert={
              status === "success" ? (
                <aha-alert type="success" size="mini">
                  {message}
                </aha-alert>
              ) : null
            }
          />
        </>
      )}
    </>
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
