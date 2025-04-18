import { z } from "zod";
import pino from "pino";
import type Slack from "@slack/bolt";
import { stripIndents } from "common-tags";

export const Env = z.object({
  TURSO_CONNECTION_URL: z.string(),
  TURSO_AUTH_TOKEN: z.string(),

  SLACK_APP_TOKEN: z.string(),
  SLACK_BOT_TOKEN: z.string(),

  SLACK_XOXC: z.string(),
  SLACK_XOXD: z.string(),

  LOGSNAG_TOKEN: z.string(),
  LOGSNAG_PROJECT: z.string(),

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "fatal"])
    .default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});
export const env = Env.parse(process.env);

export const logger = pino({
  level: env.LOG_LEVEL,
});

export async function getChannelManagers(channelId: string): Promise<string[]> {
  const formData = new FormData();
  formData.append("token", env.SLACK_XOXC || "");
  formData.append("entity_id", channelId);

  const request = await fetch(
    "https://slack.com/api/admin.roles.entity.listAssignments",
    {
      method: "POST",
      body: formData,
      headers: {
        Cookie: `d=${encodeURIComponent(env.SLACK_XOXD)}`,
      },
    }
  );

  const json = await request.json();

  if (!json.ok) return [];
  return json.role_assignments[0]?.users || [];
}

export async function getChannelCreator(
  channelId: string,
  client: Slack.webApi.WebClient
): Promise<string | null> {
  const channelInfo = await client.conversations.info({
    channel: channelId,
  });
  return channelInfo?.channel?.creator || null;
}

export function generateRandomString(length: number) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generatePingErrorMessage(
  rayId: string,
  type: "channel" | "here",
  message: string,
  userId: string,
  botId: string,
  error: unknown
) {
  logger.error(`Generating error message for ray ID ${rayId}: ${error}`);
  const escapedMessage = message.replace("`", "`");

  if (error?.toString?.().includes("channel_not_found")) {
    return stripIndents`
      :tw_warning: *Hey <@${userId}>!* Looks like this is a private channel, so you'll need to add me (<@${botId}>) to the channel and try the command again.
      For reference, your message was \`${escapedMessage}\`.
    `.trim();
  }

  return stripIndents`
    :tw_warning: *Hey <@${userId}>!* Unfortunately, I wasn't able to send your @${type} ping with message \`${escapedMessage}\`.
    Please DM <@U059VC0UDEU> so this can be fixed! Make sure to include the Ray ID (\`${rayId}\`) in your message. Thank you! :yay:
    Error was:
    \`\`\`
    ${error?.toString?.()}
    \`\`\`
  `.trim();
}

export function generateDeletePingErrorMessage(rayId: string, error: unknown) {
  return stripIndents`
  :tw_warning: Unfortunately, I wasn't able to delete your ping :pensive-hole:
  Please DM <@U059VC0UDEU> with your Ray ID (\`${rayId}\`) and the error message below.
  \`\`\`
  ${error?.toString?.()}
  \`\`\`
  `.trim();
}

export const CHANNEL_COMMAND_NAME =
  env.NODE_ENV === "development" ? "/dev-channel" : "/channel";
export const HERE_COMMAND_NAME =
  env.NODE_ENV === "development" ? "/dev-here" : "/here";
