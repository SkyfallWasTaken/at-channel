import { App, type SlackCommandMiddlewareArgs } from "@slack/bolt";
import {
  env,
  logger,
  getChannelManagers,
  getChannelCreator,
  generateRandomString,
  CHANNEL_COMMAND_NAME,
  HERE_COMMAND_NAME,
  generatePingErrorMessage,
  generateDeletePingErrorMessage,
} from "./util";
import { richTextBlockToMrkdwn } from "./richText";
import buildEditPingModal from "./editPingModal";
import { db, adminsTable, pingsTable } from "./db";
import { and, eq } from "drizzle-orm";
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

  const response = await client.chat.postMessage({
    channel: channelId,
    ...payload,
  });

  if (!response.ts) {
    throw new Error("Failed to send ping");
  }

  await db.insert(pingsTable).values({
    slackId: userId,
    ts: response.ts,
    type,
  });
}

async function updatePing(
  message: string,
  type: "channel" | "here",
  ts: string,
  channelId: string,
  client: Slack.webApi.WebClient
) {
  let finalMessage: string;
  if (message.includes(`@${type}`)) {
    finalMessage = message;
  } else {
    finalMessage = `@${type} ${message}`;
  }

  await client.chat.update({
    channel: channelId,
    ts,
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
  const rayId = generateRandomString(12);
  const { channel_id: channelId, user_id: userId } = command;
  const { text: message } = payload;
  logger.debug(
    `${rayId}: ${userId} invoked /${pingType} on ${channelId}: ${message}`
  );

  try {
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
      logger.debug(
        `${rayId}: Failed to send ping: user ${userId} not admin or channel manager`
      );
      return;
    }

    await sendPing(pingType, message, userId, channelId, client);
  } catch (e) {
    console.log(e);
    logger.error(`${rayId}: Failed to send ping: ${e}`);
    const errorMessage = generatePingErrorMessage(
      rayId,
      pingType,
      message,
      userId,
      botId as string,
      e
    );
    await respond({
      text: errorMessage,
      response_type: "ephemeral",
    });
  }
}

app.shortcut(
  { callback_id: "delete_ping", type: "message_action" },
  async ({ shortcut, ack, respond, client }) => {
    await ack();
    const rayId = `delete-ping-${generateRandomString(12)}`;
    const userId = shortcut.user.id;
    logger.debug(
      `${rayId}: ${userId} invoked delete_ping on ${shortcut.message_ts}`
    );

    const [claim] = await db
      .select()
      .from(pingsTable)
      .where(
        and(
          eq(pingsTable.ts, shortcut.message_ts),
          eq(pingsTable.slackId, userId)
        )
      );

    if (!claim) {
      const [admin] = await db
        .select()
        .from(adminsTable)
        .where(eq(adminsTable.userId, userId));

      if (!admin) {
        await respond({
          text: ":tw_warning: *You need to be the sender of this ping to delete it.*",
          response_type: "ephemeral",
        });
        logger.debug(
          `${rayId}: Failed to delete ping: user ${userId} not sender`
        );
        return;
      }
    }

    try {
      await client.chat.delete({
        channel: shortcut.channel.id,
        ts: shortcut.message_ts,
      });
      await db.delete(pingsTable).where(eq(pingsTable.ts, shortcut.message_ts));
    } catch (e) {
      logger.error(`${rayId}: Failed to delete ping: ${e}`);
      const errorMessage = generateDeletePingErrorMessage(rayId, e);
      await respond({
        text: errorMessage,
        response_type: "ephemeral",
      });
    }
  }
);
app.shortcut(
  { callback_id: "edit_ping", type: "message_action" },
  async ({ shortcut, ack, respond, client }) => {
    await ack();
    const rayId = `edit-ping-${generateRandomString(12)}`;
    const userId = shortcut.user.id;
    logger.debug(
      `${rayId}: ${userId} invoked edit_ping on ${shortcut.message_ts}`
    );

    const [claim] = await db
      .select()
      .from(pingsTable)
      .where(
        and(
          eq(pingsTable.ts, shortcut.message_ts),
          eq(pingsTable.slackId, userId)
        )
      );

    if (!claim) {
      const [admin] = await db
        .select()
        .from(adminsTable)
        .where(eq(adminsTable.userId, userId));

      if (!admin) {
        await respond({
          text: ":tw_warning: *You need to be the sender of this ping to edit it.*",
          response_type: "ephemeral",
        });
        logger.debug(
          `${rayId}: Failed to edit ping: user ${userId} not sender`
        );
        return;
      }
    }

    const modal = buildEditPingModal(
      shortcut.channel.id,
      userId,
      rayId,
      claim.ts,
      claim.type
    );
    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: modal,
    });
  }
);

app.view(
  "edit_ping_modal_submit",
  async ({ ack, respond, client, view, body }) => {
    await ack();
    const { channelId, ts, type, rayId } = JSON.parse(view.private_metadata);
    const message = richTextBlockToMrkdwn(
      // biome-ignore lint/style/noNonNullAssertion: Will always be there - it's a required field
      view.state.values.message.message_input.rich_text_value!
    );
    let finalMessage: string;
    if (message.includes(`@${type}`)) {
      finalMessage = message;
    } else {
      finalMessage = `@${type} ${message}`;
    }

    try {
      await client.chat.update({
        channel: channelId,
        ts,
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
      });
    } catch (e) {
      logger.error(`${rayId}: Failed to edit ping: ${e}`);
      const errorMessage = generatePingErrorMessage(
        rayId,
        type,
        message,
        body.user.id,
        botId as string,
        e
      );
      await respond({
        text: errorMessage,
        response_type: "ephemeral",
      });
    }
  }
);

app.command(CHANNEL_COMMAND_NAME, pingCommand.bind(null, "channel"));
app.command(HERE_COMMAND_NAME, pingCommand.bind(null, "here"));

await app.start();

logger.info("Started @channel!");
