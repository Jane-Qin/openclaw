const suggestionPlaceholders = new Map<string, string>();

export function getChatAgentComposerSuggestionPlaceholder(
  sessionKey: string,
): string | undefined {
  return suggestionPlaceholders.get(sessionKey);
}

export function setChatAgentComposerSuggestionPlaceholder(
  sessionKey: string,
  cardDesc: string,
): void {
  suggestionPlaceholders.set(sessionKey, cardDesc);
}

export function clearChatAgentComposerSuggestionPlaceholder(sessionKey: string): void {
  suggestionPlaceholders.delete(sessionKey);
}
