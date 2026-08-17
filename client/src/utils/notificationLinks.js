/**
 * getNotificationNavState
 * Chat-related notifications (a DM, a group invite) point their `link` at
 * the general /app/chat section — the specific conversation to open lives
 * in `entityId`. ChatPage already knows how to jump straight to a
 * conversation when it arrives via router state (see the Directory page's
 * "message" button), so we just need to hand it the same
 * `{ openConversationId }` state on navigate instead of landing on
 * whichever conversation happened to be open last.
 */
const CHAT_NOTIFICATION_TYPES = ['CHAT_MESSAGE', 'GROUP_INVITE'];

export function getNotificationNavState(item) {
  if (CHAT_NOTIFICATION_TYPES.includes(item.type) && item.entityId) {
    return { openConversationId: item.entityId };
  }
  return undefined;
}
