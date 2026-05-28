import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";
import { getContextNoticeViewModel } from "../chat/context-notice.ts";
import { icons } from "../icons.ts";
import type { GatewaySessionRow } from "../types.ts";

/** Hover menu beside send — compact context usage and compaction controls. */
export function renderChatAgentComposeExtras(params: {
  compactBusy: boolean;
  compactDisabled: boolean;
  session?: GatewaySessionRow;
  defaultContextTokens?: number | null;
  onCompact?: () => void | Promise<void>;
}) {
  const context = getContextNoticeViewModel(params.session, params.defaultContextTokens ?? null);
  const pct = context?.pct ?? 0;
  const contextDetail = context?.detail ?? "—";
  const contextColor = context?.color ?? "var(--muted)";
  const contextBg = context?.bg ?? "color-mix(in srgb, var(--muted) 8%, transparent)";
  const contextLabel = context
    ? `${pct}% ${contextDetail} used context`
    : t("chatagent.composeMenu.title");
  const contextSummary = context ? `${pct}% ${contextDetail}` : "—";
  return html`
    <div
      class="chatagent-compose-menu"
      style="--chatagent-context-pct:${pct};--chatagent-context-color:${contextColor};--chatagent-context-bg:${contextBg}"
    >
      <button
        type="button"
        class="agent-chat__input-btn chatagent-compose-menu__trigger ${context?.warning
          ? "chatagent-compose-menu__trigger--warning"
          : ""}"
        aria-label=${contextLabel}
        title=${contextLabel}
      >
        <span class="chatagent-compose-menu__ring" aria-hidden="true">
          <span class="chatagent-compose-menu__ring-core">${pct}%</span>
        </span>
      </button>
      <div class="chatagent-compose-menu__panel" role="tooltip">
        <div class="chatagent-compose-menu__context">
          <div class="chatagent-compose-menu__context-body">
            <div class="chatagent-compose-menu__context-title">${t("chatagent.composeMenu.contextTitle")}</div>
            <div class="chatagent-compose-menu__context-detail">${contextSummary}</div>
          </div>
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
