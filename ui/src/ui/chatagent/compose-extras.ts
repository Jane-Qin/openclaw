import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { icons } from "../icons.ts";

/** Hover menu beside send — compact shortcut; context usage uses /chat `renderContextNotice`. */
export function renderChatAgentComposeExtras(params: {
  compactBusy: boolean;
  compactDisabled: boolean;
  onCompact?: () => void | Promise<void>;
}) {
  return html`
    <div class="chatagent-compose-menu">
      <button
        type="button"
        class="agent-chat__input-btn chatagent-compose-menu__trigger"
        aria-label=${t("chatagent.composeMenu.title")}
      >
        ${icons.menu}
      </button>
      <div class="chatagent-compose-menu__panel" role="tooltip">
        <div class="chatagent-compose-menu__header">
          <span class="chatagent-compose-menu__header-icon" aria-hidden="true">${icons.menu}</span>
          <span>${t("chatagent.composeMenu.hint")}</span>
        </div>
        ${params.onCompact
          ? html`
              <button
                type="button"
                class="chatagent-compose-menu__compact-btn ${params.compactBusy
                  ? "chatagent-compose-menu__compact-btn--busy"
                  : ""}"
                ?disabled=${params.compactDisabled}
                @click=${() => {
                  if (params.compactDisabled) {
                    return;
                  }
                  void params.onCompact?.();
                }}
              >
                ${params.compactBusy ? icons.loader : nothing}
                ${t("chatagent.composeMenu.compact")}
              </button>
            `
          : nothing}
      </div>
    </div>
  `;
}
