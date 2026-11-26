const allowedBranch = "feature/hiphop-runway-preview";

export function canViewRoom(env: string | undefined, branch: string | undefined, local: boolean) {
  if (env === "preview") return branch === allowedBranch;
  return env === undefined && local;
}
