import { html } from "lit";

/** DataWorks Agent fork — visible marker for custom Control UI builds (MVP). */
export const DATAWORKS_AGENT_PRODUCT_LABEL = "DataWorks Agent";

export const DATAWORKS_AGENT_BUILD_MARKER = "dataworks-agent";

export function renderDataworksWelcomeBadge() {
  return html`
    <span class="agent-chat__badge agent-chat__badge--dataworks" title=${DATAWORKS_AGENT_BUILD_MARKER}>
      ${DATAWORKS_AGENT_PRODUCT_LABEL}
    </span>
  `;
}
