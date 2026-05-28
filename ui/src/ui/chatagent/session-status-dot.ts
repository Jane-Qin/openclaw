import { html, nothing } from "lit";
import type { GatewaySessionRow } from "../types.ts";
 
export function renderChatAgentSessionLiveIndicator(row?: GatewaySessionRow) {
  if (!row?.hasActiveRun) {
    return nothing;
  }
  return html`<span class="chatagent-session-item__live" aria-hidden="true"></span>`;
}
