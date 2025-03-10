import type Slack from "@slack/bolt";

export const quoteMrkdwn = (text: string): string => {
  return `> ${text}`.split("\n").join("\n> ");
};

const applyMrkdwnStyle = (
  text: string,
  style: Slack.types.RichTextElement["style"]
): string => {
  if (!style || text.startsWith(" ") || text.endsWith(" ")) return text;

  let updatedText = text;
  if (style.code) updatedText = `\`${updatedText}\``;
  if (style.strike) updatedText = `~${updatedText}~`;
  if (style.italic) updatedText = `_${updatedText}_`;
  if (style.bold) updatedText = `*${updatedText}*`;

  return updatedText;
};

// Conversion from these docs: https://api.slack.com/reference/surfaces/formatting#advanced
const richTextElementToMrkdwn = (
  element: Slack.types.RichTextElement
): string => {
  switch (element.type) {
    case "broadcast":
      return applyMrkdwnStyle(`<!${element.range}>`, element.style);
    case "channel":
      return applyMrkdwnStyle(`<#${element.channel_id}>`, element.style);
    case "color":
      return applyMrkdwnStyle(element.value, element.style);
    case "date": {
      let dateText = `<!date^${element.timestamp}^${element.format}`;
      if (element.url) dateText += `^${element.url}`;
      if (element.fallback) dateText += `|${element.fallback}`;
      dateText += ">";
      return applyMrkdwnStyle(dateText, element.style);
    }
    case "emoji":
      return `:${element.name}:`;
    case "link": {
      const formattedText = element.text
        ? `<${element.url}|${element.text}>`
        : element.url;
      return applyMrkdwnStyle(formattedText, element.style);
    }
    case "team": // There is no documented way to display this nicely in mrkdwn
      return applyMrkdwnStyle(element.team_id, element.style);
    case "text":
      return applyMrkdwnStyle(element.text, element.style);
    case "user":
      return applyMrkdwnStyle(`<@${element.user_id}>`, element.style);
    case "usergroup":
      return applyMrkdwnStyle(
        `<!subteam^${element.usergroup_id}>`,
        element.style
      );
    default:
      return "";
  }
};

const richTextSectionToMrkdwn = (
  section: Slack.types.RichTextSection
): string => {
  return section.elements.map(richTextElementToMrkdwn).join("");
};

const richTextListToMrkdwn = (element: Slack.types.RichTextList): string => {
  let mrkdwn = "";
  for (const section of element.elements) {
    mrkdwn += `${"    ".repeat(
      element.indent ?? 0
    )} • ${richTextSectionToMrkdwn(section)}\n`;
  }

  return mrkdwn;
};

const richTextBlockElementToMrkdwn = (
  element: Slack.types.RichTextBlockElement
): string => {
  switch (element.type) {
    case "rich_text_list":
      return richTextListToMrkdwn(element);
    case "rich_text_preformatted":
      return `\`\`\`${element.elements
        .map(richTextElementToMrkdwn)
        .join("")}\`\`\``;
    case "rich_text_quote":
      return quoteMrkdwn(
        element.elements.map(richTextElementToMrkdwn).join("")
      );
    case "rich_text_section":
      return element.elements.map(richTextElementToMrkdwn).join("");
    default:
      return "";
  }
};

// Slack doesn't provide tools out of the box for converting a rich text block to mrkdwn
// See this issue: https://github.com/slackapi/bolt-js/issues/2087
export const richTextBlockToMrkdwn = (
  richTextBlock: Slack.types.RichTextBlock
) => {
  const mrkdwn = richTextBlock.elements
    .map(richTextBlockElementToMrkdwn)
    .join("");

  return mrkdwn;
};
