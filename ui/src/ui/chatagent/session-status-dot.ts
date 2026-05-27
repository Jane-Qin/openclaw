import { html, nothing } from "lit";
import type { GatewaySessionRow } from "../types.ts";

/** Compact session status dot before session name (matches /chat sidebar pattern). */
export function renderChatAgentSessionStatusDot(params: {
  active: boolean;
}) {
  return html`
    <span
      class="chatagent-session-item__dot ${params.active ? "chatagent-session-item__dot--active" : ""}"
      aria-hidden="true"
    ></span>
  `;
}

export function renderChatAgentSessionLiveIndicator(row?: GatewaySessionRow) {
  if (!row?.hasActiveRun) {
    return nothing;
  }
  return html`<span class="chatagent-session-item__live" aria-hidden="true"></span>`;
}
