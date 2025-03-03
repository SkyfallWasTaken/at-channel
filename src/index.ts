import { App, type SlackCommandMiddlewareArgs } from "@slack/bolt";
import { env, logger, getChannelManagers, getChannelCreator } from "./util";
import { db, adminsTable, webhooksTable } from "./db";
import { and, eq } from "drizzle-orm";
import type Slack from "@slack/bolt";
import buildWebhookModal from "./webhookModal";

const app = new App({
  appToken: env.SLACK_APP_TOKEN,
  token: env.SLACK_BOT_TOKEN,
  socketMode: true,
});
const botId = (
  await app.client.auth.test({
    token: env.SLACK_BOT_TOKEN,
  })
).user_id;

async function sendPing(
  type: "channel" | "here",
  message: string,
  webhookUrl: string
) {
  let finalMessage: string;
  if (message.includes(`@${type}`)) {
    finalMessage = message;
  } else {
    finalMessage = `@${type} ${message}`;
  }

  const payload = {
    text: finalMessage,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: finalMessage,
        },
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function pingCommand(
  pingType: "channel" | "here",
  {
    command,
    ack,
    respond,
    payload,
    client,
    body,
  }: SlackCommandMiddlewareArgs & { client: Slack.webApi.WebClient }
) {
  await ack();
  const { channel_id: channelId, user_id: userId } = command;
  const { text: message } = payload;
  logger.debug(`${userId} invoked /${pingType} on ${channelId}: ${message}`);

  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.userId, userId));
  const channelManagers = await getChannelManagers(channelId);
  if (
    !admin &&
    !channelManagers.includes(userId) &&
    (await getChannelCreator(channelId, client)) !== userId
  ) {
    await respond({
      text: `:tw_warning: *You need to be a channel manager to use this command.*\nIf this is a private channel, you'll need to add <@${botId}> to the channel.`,
      response_type: "ephemeral",
    });
    return;
  }

  const [webhook] = await db
    .select()
    .from(webhooksTable)
    .where(
      and(
        eq(webhooksTable.userId, userId),
        eq(webhooksTable.channelId, channelId)
      )
    );
  if (!webhook) {
    const modal = buildWebhookModal(userId, channelId, message, pingType);
    await client.views.open({ trigger_id: body.trigger_id, view: modal });
    return;
  }

  await sendPing(pingType, message, webhook.webhookUrl);
}

app.command("/channel", pingCommand.bind(null, "channel"));
app.command("/here", pingCommand.bind(null, "here"));

app.view("add-webhook-modal", async ({ ack, view }) => {
  await ack();

  const {
    userId,
    channelId,
    message,
    type,
  }: {
    userId: string;
    message: string;
    channelId: string;
    type: "channel" | "here";
  } = JSON.parse(view.private_metadata);
  // biome-ignore lint/style/noNonNullAssertion: Always set
  const webhookUrl = view.state.values.webhook_url_input.webhook_url.value!;

  logger.debug(`Adding webhook for ${userId}: ${webhookUrl}`);
  await db.insert(webhooksTable).values({
    userId,
    channelId,
    webhookUrl,
  });

  await sendPing(type, message, webhookUrl);
});

await app.start();

logger.info("Started @channel!");
