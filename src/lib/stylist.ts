// Who counts as a stylist: editors (moderators, admins) and anyone with a published Styling Note.
export function isStylist({ roles, published }: { roles: readonly string[]; published: number }) {
  return roles.some(r => r === "moderator" || r === "admin") || published > 0;
}
