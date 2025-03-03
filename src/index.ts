import { App, type SlackCommandMiddlewareArgs } from "@slack/bolt";
import {
  env,
  logger,
  getChannelManagers,
  getChannelCreator,
  CHANNEL_COMMAND_NAME,
  HERE_COMMAND_NAME,
} from "./util";
import { db, adminsTable } from "./db";
import { eq } from "drizzle-orm";
import type Slack from "@slack/bolt";

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
  userId: string,
  channelId: string,
  client: Slack.webApi.WebClient
) {
  let finalMessage: string;
  if (message.includes(`@${type}`)) {
    finalMessage = message;
  } else {
    finalMessage = `@${type} ${message}`;
  }

  const user = await client.users.info({ user: userId });
  const displayName =
    user?.user?.profile?.display_name || user?.user?.name || "<unknown>";
  const avatar =
    user?.user?.profile?.image_original || user?.user?.profile?.image_512;

  const payload = {
    text: finalMessage,
    username: displayName,
    icon_url: avatar,
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

  await client.chat.postMessage({
    channel: channelId,
    ...payload,
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

  await sendPing(pingType, message, userId, channelId, client);
}

app.command(CHANNEL_COMMAND_NAME, pingCommand.bind(null, "channel"));
app.command(HERE_COMMAND_NAME, pingCommand.bind(null, "here"));

await app.start();

logger.info("Started @channel!");
