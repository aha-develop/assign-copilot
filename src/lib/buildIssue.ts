type RecordAttachment = {
  fileName: string;
  contentType: string;
  downloadUrl: string;
};

type FetchedFeature = Aha.Feature & {
  referenceNum: string;
  name: string;
  path: string;
  description?: { markdownBody?: string; attachments?: RecordAttachment[] };
};

type FetchedRequirement = Aha.Requirement & {
  referenceNum: string;
  name: string;
  path: string;
  description?: { markdownBody?: string; attachments?: RecordAttachment[] };
  feature?: {
    referenceNum: string;
    name?: string;
    description?: { markdownBody?: string; attachments?: RecordAttachment[] };
  };
  tasks?: Array<{
    name: string;
    body?: string;
  }>;
};

type FeatureType = Pick<
  Aha.Feature,
  "setExtensionField" | "getExtensionField"
> & {
  typename: "Feature";
  id: string;
  referenceNum: string;
};
type RequirementType = Pick<
  Aha.Requirement,
  "setExtensionField" | "getExtensionField"
> & {
  typename: "Requirement";
  id: string;
  referenceNum: string;
};

export type RecordType = FeatureType | RequirementType;

/**
 * Data stored in extension fields to track Copilot assignment.
 */
export interface CopilotIssueData {
  issueNumber: number;
  issueUrl: string;
  assignedAt: string;
}

/**
 * Fetches full record details including name, path, and description.
 */
async function describeFeature(record: FeatureType): Promise<{
  body: string;
  attachments: Aha.Attachment[];
  model: FetchedFeature;
}> {
  const feature = await aha.models.Feature.select(
    "id",
    "name",
    "path",
    "referenceNum",
  )
    .merge({
      description: aha.models.Note.select("markdownBody").merge({
        attachments: aha.models.Attachment.select("fileName", "contentType", {
          downloadUrl: { withToken: true },
        }),
      }),
      tasks: aha.models.Task.select("name", "body"),
      requirements: aha.models.Requirement.select("name", "referenceNum"),
    })
    .find(record.referenceNum);

  if (!feature) {
    throw new Error("Failed to fetch feature details.");
  }

  const body = `### Description

${feature.description?.markdownBody}

${
  feature.requirements && feature.requirements.length > 0
    ? "### Requirements\n"
    : ""
}${feature.requirements
    ?.map(
      (req) => `- **${req.referenceNum}**: ${req.name || "No name provided"}`,
    )
    .join("\n")}

${feature.tasks && feature.tasks.length > 0 ? "### Todos\n" : ""}${feature.tasks
    ?.map((task) => `- **${task.name}**\n\n${task.body || ""}`)
    .join("\n\n")}

**Aha! Reference:** [${record.referenceNum}](${feature.path})
`;

  return {
    body,
    attachments: feature.description?.attachments ?? [],
    model: feature,
  };
}

async function describeRequirement(record: RequirementType) {
  const requirement: FetchedRequirement = await aha.models.Requirement.select(
    "id",
    "name",
    "referenceNum",
    "path",
  )
    .merge({
      description: aha.models.Note.select("markdownBody").merge({
        attachments: aha.models.Attachment.select("fileName", "contentType", {
          downloadUrl: { withToken: true },
        }),
      }),
      tasks: aha.models.Task.select("name", "body"),
      feature: aha.models.Feature.select("name", "referenceNum").merge({
        description: aha.models.Note.select("markdownBody").merge({
          attachments: aha.models.Attachment.select("fileName", "contentType", {
            downloadUrl: { withToken: true },
          }),
        }),
      }),
    })
    .find(record.referenceNum);

  if (!requirement) {
    throw new Error("Failed to fetch requirement details.");
  }

  const body = `### Description

${requirement.description?.markdownBody}

## Feature ${requirement.feature.referenceNum}

${requirement.feature.description?.markdownBody}

${
  requirement.tasks && requirement.tasks.length > 0 ? "### Todos\n" : ""
}${requirement.tasks
    ?.map((task) => `- **${task.name}**\n\n${task.body || ""}`)
    .join("\n\n")}

**Aha! Reference:** [${record.referenceNum}](${requirement.path})
`;

  return {
    body,
    attachments: [
      ...(requirement.description?.attachments ?? []),
      ...(requirement.feature.description?.attachments ?? []),
    ],
    model: requirement,
  };
}

/**
 * Builds the issue body for a GitHub issue to be assigned to Copilot.
 *
 * @param record - The minimal record from the Aha! context
 * @param customInstructions - Additional instructions for Copilot (optional)
 */
export async function buildIssue(
  record: RecordType,
  customInstructions?: string,
): Promise<{
  title: string;
  body: string;
  model: FetchedFeature | FetchedRequirement;
}> {
  let { body, attachments, model } =
    record.typename === "Feature"
      ? await describeFeature(record as FeatureType)
      : await describeRequirement(record as RequirementType);

  if (attachments.length > 0) {
    body += `\n\n### Attachments\n`;
    attachments.forEach((att) => {
      body += `- [${att.fileName}](${att.downloadUrl})\n`;
    });
  }

  if (customInstructions) {
    body += `
### Additional Instructions

${customInstructions}
`;
  }

  const title = `${model.referenceNum}: ${model.name}`;

  return {
    title,
    body,
    model,
  };
}
