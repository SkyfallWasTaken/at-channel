import type Slack from "@slack/bolt";

export default (
  channelId: string,
  userId: string,
  rayId: string,
  ts: string,
  type: "channel" | "here",
): Slack.types.ModalView => {
  return {
    type: "modal",
    callback_id: "edit_ping_modal_submit",
    title: {
      type: "plain_text",
      text: `Edit @${type} ping`,
      emoji: true,
    },
    private_metadata: JSON.stringify({
      channelId,
      userId,
      rayId,
      ts,
      type,
    }),
    submit: {
      type: "plain_text",
      text: "Submit",
      emoji: true,
    },
    blocks: [
      {
        type: "input",
        block_id: "message",
        label: {
          type: "plain_text",
          text: "Message",
          emoji: true,
        },
        hint: {
          text: `Tip: to not have the ping at the start of your message, add @${type} where you want the ping to be.`,
          type: "plain_text",
        },
        element: {
          type: "rich_text_input",
          action_id: "message_input",
        },
      },
    ],
  };
};
