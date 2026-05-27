import type { SessionOptionGroup } from "../chat/session-controls.ts";

export function filterChatAgentSessionGroups(
  groups: SessionOptionGroup[],
  query: string,
): SessionOptionGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return groups;
  }
  return groups
    .map((group) => {
      const groupMatches = group.label.toLowerCase().includes(normalized);
      const options = group.options.filter(
        (option) =>
          groupMatches ||
          option.label.toLowerCase().includes(normalized) ||
          option.key.toLowerCase().includes(normalized) ||
          option.scopeLabel.toLowerCase().includes(normalized),
      );
      return { ...group, options };
    })
    .filter((group) => group.options.length > 0);
}
