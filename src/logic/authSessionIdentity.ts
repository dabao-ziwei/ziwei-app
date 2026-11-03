// UI continuity key only, NOT authorization. The RPC and database still validate access.
// A refreshed JWT belongs to the same login when user ID and session_id are unchanged.
export function authSessionIdentity(session: { access_token?: string; user?: { id?: string } } | null | undefined): string | null {
  const token = session?.access_token;
  const userId = session?.user?.id;
  if (!token || !userId) return null;
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    if (claims.sub === userId && typeof claims.session_id === 'string' && claims.session_id) {
      return JSON.stringify([userId, claims.session_id]);
    }
  } catch {
    // Unrecognized tokens must not reuse a previous login's successful check.
  }
  return JSON.stringify([userId, token]);
}
