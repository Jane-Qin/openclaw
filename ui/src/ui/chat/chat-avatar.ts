import { html } from "lit";
import type { AssistantIdentity } from "../assistant-identity.ts";
import {
  resolveLocalUserAvatarText,
  resolveLocalUserAvatarUrl,
  resolveLocalUserName,
} from "../user-identity.ts";
import {
  assistantAvatarFallbackUrl,
  isRenderableControlUiAvatarUrl,
  resolveAssistantTextAvatar,
} from "../views/agents-utils.ts";
import { normalizeRoleForGrouping } from "./role-normalizer.ts";

export function renderChatAvatar(
  role: string,
  assistant?: Pick<AssistantIdentity, "name" | "avatar">,
  user?: { name?: string | null; avatar?: string | null },
  basePath?: string,
  authToken?: string | null,
  unifiedIcons = false,
) {
  const normalized = normalizeRoleForGrouping(role);
  const assistantName = assistant?.name?.trim() || "Assistant";
  const assistantAvatar = assistant?.avatar?.trim() || "";
  const assistantAvatarText = resolveAssistantTextAvatar(assistantAvatar);
  const assistantFallbackAvatar = assistantAvatarFallbackUrl(basePath ?? "");
  const userName = resolveLocalUserName(user);
  const userAvatarUrl = resolveLocalUserAvatarUrl(user);
  const userAvatarText = resolveLocalUserAvatarText(user);

  // Unified assistant icon: robot head
  const assistantIcon = html`
    <svg viewBox="0 0 1024 1024" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path
        d="M298.666667 810.666667h426.666666v42.666666a42.666667 42.666667 0 0 1-42.666666 42.666667H341.333333a42.666667 42.666667 0 0 1-42.666666-42.666667v-42.666666z m405.333333-640A192 192 0 0 1 896 362.666667v213.333333a192 192 0 0 1-192 192h-384A192 192 0 0 1 128 576v-213.333333A192 192 0 0 1 320 170.666667h384z m0 72.533333h-384a119.466667 119.466667 0 0 0-119.466667 119.466667v213.333333a119.466667 119.466667 0 0 0 119.466667 119.466667h384a119.466667 119.466667 0 0 0 119.466667-119.466667v-213.333333a119.466667 119.466667 0 0 0-119.466667-119.466667zM640 384a42.666667 42.666667 0 0 1 42.666667 42.666667v85.333333a42.666667 42.666667 0 0 1-85.333334 0v-85.333333a42.666667 42.666667 0 0 1 42.666667-42.666667zM384 384a42.666667 42.666667 0 0 1 42.666667 42.666667v85.333333a42.666667 42.666667 0 1 1-85.333334 0v-85.333333a42.666667 42.666667 0 0 1 42.666667-42.666667z m576-42.666667a42.666667 42.666667 0 0 1 42.666667 42.666667v170.666667a42.666667 42.666667 0 0 1-85.333334 0V384a42.666667 42.666667 0 0 1 42.666667-42.666667z m-896 0a42.666667 42.666667 0 0 1 42.666667 42.666667v170.666667a42.666667 42.666667 0 1 1-85.333334 0V384a42.666667 42.666667 0 0 1 42.666667-42.666667z"
      />
    </svg>
  `;

  // Unified user icon: simple person silhouette
  const userIcon = html`
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  `;

  const initial =
    normalized === "user"
      ? userIcon
      : normalized === "assistant"
        ? assistantIcon
        : normalized === "tool"
          ? html`
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path
                  d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53a7.76 7.76 0 0 0 .07-1 7.76 7.76 0 0 0-.07-.97l2.11-1.63a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.15 7.15 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65a7.15 7.15 0 0 0-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64L4.57 11a7.9 7.9 0 0 0 0 1.94l-2.11 1.69a.49.49 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.72 1.69.98l.38 2.65c.05.24.26.42.49.42h4c.23 0 .44-.18.49-.42l.38-2.65a7.15 7.15 0 0 0 1.69-.98l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.49.49 0 0 0-.12-.64z"
                />
              </svg>
            `
          : html`
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <circle cx="12" cy="12" r="10" />
                <text
                  x="12"
                  y="16.5"
                  text-anchor="middle"
                  font-size="14"
                  font-weight="600"
                  fill="var(--bg, #fff)"
                >
                  ?
                </text>
              </svg>
            `;
  const className =
    normalized === "user"
      ? "user"
      : normalized === "assistant"
        ? "assistant"
        : normalized === "tool"
          ? "tool"
          : "other";

  if (!unifiedIcons && normalized === "user" && userAvatarUrl) {
    return html`<img class="chat-avatar ${className}" src="${userAvatarUrl}" alt="${userName}" />`;
  }

  if (!unifiedIcons && normalized === "user" && userAvatarText) {
    return html`<div class="chat-avatar ${className}" aria-label="${userName}">
      ${userAvatarText}
    </div>`;
  }

  if (!unifiedIcons && assistantAvatar && normalized === "assistant") {
    if (isAvatarUrl(assistantAvatar)) {
      if (authToken?.trim() && assistantAvatar.startsWith("/")) {
        return html`<img
          class="chat-avatar ${className} chat-avatar--logo"
          src="${assistantFallbackAvatar}"
          alt="${assistantName}"
        />`;
      }
      return html`<img
        class="chat-avatar ${className}"
        src="${assistantAvatar}"
        alt="${assistantName}"
      />`;
    }
    if (assistantAvatarText) {
      return html`<div class="chat-avatar ${className}" aria-label="${assistantName}">
        ${assistantAvatarText}
      </div>`;
    }
    return html`<img
      class="chat-avatar ${className} chat-avatar--logo"
      src="${assistantFallbackAvatar}"
      alt="${assistantName}"
    />`;
  }

  if (!unifiedIcons && normalized === "assistant") {
    return html`<img
      class="chat-avatar ${className} chat-avatar--logo"
      src="${assistantFallbackAvatar}"
      alt="${assistantName}"
    />`;
  }

  return html`<div class="chat-avatar ${className}" aria-hidden="true">${initial}</div>`;
}

function isAvatarUrl(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("blob:") || isRenderableControlUiAvatarUrl(trimmed);
}
