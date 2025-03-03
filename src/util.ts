import { z } from "zod";
import pino from "pino";

export const Env = z.object({
  TURSO_CONNECTION_URL: z.string(),
  TURSO_AUTH_TOKEN: z.string(),

  SLACK_APP_TOKEN: z.string(),
  SLACK_BOT_TOKEN: z.string(),

  SLACK_XOXC: z.string(),
  SLACK_XOXD: z.string(),

  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "fatal"])
    .default("info"),
});
export const env = Env.parse(process.env);

export const logger = pino({
  level: env.LOG_LEVEL,
});

export async function getChannelManagers(channelId: string): Promise<string[]> {
  const headers = new Headers();
  headers.append("Cookie", env.SLACK_XOXD);

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
  console.log(json);

  if (!json.ok) return [];
  return json.role_assignments[0]?.users || [];
}
