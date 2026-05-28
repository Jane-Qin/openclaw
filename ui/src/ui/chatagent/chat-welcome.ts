import { html } from "lit";
import { t } from "../../i18n/index.ts";
import {
  agentLogoUrl,
  assistantAvatarFallbackUrl,
  resolveChatAvatarRenderUrl,
  resolveAssistantTextAvatar,
} from "../views/agents-utils.ts";
import { CHATAGENT_SUGGESTION_CARDS } from "./suggestion-cards.ts";

export type ChatAgentWelcomeProps = {
  assistantName: string;
  assistantAvatar: string | null;
  assistantAvatarUrl?: string | null;
  basePath?: string;
  onSuggestionSelect: (cardDesc: string) => void;
};

function resolveAssistantAvatarUrl(
  props: Pick<ChatAgentWelcomeProps, "assistantAvatar" | "assistantAvatarUrl">,
): string | null {
  return resolveChatAvatarRenderUrl(props.assistantAvatarUrl, {
    identity: {
      avatar: props.assistantAvatar ?? undefined,
      avatarUrl: props.assistantAvatarUrl ?? undefined,
    },
  });
}

export function renderChatAgentWelcomeState(props: ChatAgentWelcomeProps) {
  const name = props.assistantName || "Assistant";
  const avatar = resolveAssistantAvatarUrl(props);
  const avatarText = avatar ? null : resolveAssistantTextAvatar(props.assistantAvatar);
  const fallbackAvatarUrl = assistantAvatarFallbackUrl(props.basePath ?? "");
  const logoUrl = agentLogoUrl(props.basePath ?? "");

  return html`
    <div class="agent-chat__welcome agent-chat__welcome--chatagent" style="--agent-color: var(--accent)">
      <div class="agent-chat__welcome-glow"></div>
      ${avatar
        ? html`<img
            src=${avatar}
            alt=${name}
            style="width:56px; height:56px; border-radius:50%; object-fit:cover;"
          />`
        : avatarText
          ? html`<div class="agent-chat__avatar agent-chat__avatar--text" aria-label=${name}>
              ${avatarText}
            </div>`
          : html`<div class="agent-chat__avatar agent-chat__avatar--logo">
              <img src=${fallbackAvatarUrl} alt=${name} />
            </div>`}
      <h2>${t("chatagent.welcome.title", { name })}</h2>
      <div class="agent-chat__badges">
        <span class="agent-chat__badge"
          ><img src=${logoUrl} alt="" /> ${t("chatagent.welcome.ready")}</span
        >
      </div>
      <p class="agent-chat__hint">${t("chatagent.welcome.subtitle")}</p>
      <div class="agent-chat__suggestions agent-chat__suggestions--chatagent">
        ${CHATAGENT_SUGGESTION_CARDS.map(
          (card) => html`
            <button
              type="button"
              class="agent-chat__suggestion"
              @click=${() => props.onSuggestionSelect(card.cardDesc)}
            >
              ${card.cardName}
            </button>
          `,
        )}
      </div>
    </div>
  `;
}
