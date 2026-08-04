export type NotificationVisibilityRow = {
  target_user_id?: string | null;
};

export function notificationVisibilityFilter(userId: string | null) {
  return userId
    ? `target_user_id.is.null,target_user_id.eq.${userId}`
    : "target_user_id.is.null";
}

export function isNotificationVisibleToUser(
  row: NotificationVisibilityRow,
  userId: string | null,
) {
  return row.target_user_id === null || row.target_user_id === userId;
}
