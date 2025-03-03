import type Slack from "@slack/bolt";

const MODAL_TEXT =
  ":wave: *Hey! Please enter a URL to a webhook.* We'll post to this whenever you run @channel.";

export default (
  userId: string,
  channelId: string,
  message: string,
  type: "channel" | "here"
): Slack.types.ModalView => {
  return {
    type: "modal",
    private_metadata: JSON.stringify({ userId, channelId, message, type }),
    callback_id: "add-webhook-modal",
    title: {
      type: "plain_text",
      text: "Add a webhook",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Add Webhook",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: MODAL_TEXT,
        },
      },
      {
        type: "input",
        block_id: "webhook_url_input",
        element: {
          type: "url_text_input",
          action_id: "webhook_url",
          placeholder: {
            type: "plain_text",
            text: "https://hooks.slack.com/...",
          },
        },
        label: {
          type: "plain_text",
          text: "Webhook URL",
          emoji: true,
        },
      },
    ],
  };
};
