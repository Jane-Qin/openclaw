import { html } from "lit";
import { t } from "../../i18n/index.ts";
import { CHATAGENT_SUGGESTION_CARDS } from "./suggestion-cards.ts";

export type ChatAgentWelcomeProps = {
  onSuggestionSelect: (cardDesc: string) => void;
};

export function renderChatAgentWelcomeState(props: ChatAgentWelcomeProps) {
  return html`
    <div class="agent-chat__welcome agent-chat__welcome--chatagent">
      <div class="agent-chat__welcome-hero">
        <h1 class="agent-chat__welcome-title">
          Hello, I'm <span class="agent-chat__welcome-title-name">Dataos Data Agent</span>
          <span class="agent-chat__welcome-title-arrow" aria-hidden="true">↑</span>
        </h1>
        <p class="agent-chat__welcome-desc">${t("chatagent.welcome.subtitle")}</p>
      </div>
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
