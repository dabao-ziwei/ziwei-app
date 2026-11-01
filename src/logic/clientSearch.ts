interface SearchableClient {
  name?: string;
  birthYear?: number;
  creatorEmail?: string;
  majorStars?: string;
  user_id?: string;
  creatorRole?: string;
  type?: string;
}

export const getClientListCategory = (client: SearchableClient, viewerIsOwner: boolean): string => {
  if (viewerIsOwner && client.creatorRole === 'student') return '學員';
  return client.type || '其他';
};

export const isClientEmailSearch = (term: string): boolean => term.trim().includes('@');

export const matchesClientSearch = (client: SearchableClient, input: string, majorStars: readonly string[]): boolean => {
  const term = input.trim().toLowerCase();
  if (!term) return true;
  // An email is literal text, never a combination of star-name filters.
  if (isClientEmailSearch(term)) return (client.creatorEmail || '').toLowerCase().includes(term);
  const stars = majorStars.filter(star => term.includes(star));
  const text = stars.reduce((value, star) => value.replaceAll(star, ' '), term).trim();
  const textMatch = !text || (client.name || '').toLowerCase().includes(text)
    || String(client.birthYear ?? '').includes(text) || (client.creatorEmail || '').toLowerCase().includes(text);
  return textMatch && stars.every(star => (client.majorStars || '').includes(star));
};

export const matchesClientOwnership = (
  client: SearchableClient, currentUserId: string | null, owner: boolean, onlyMine: boolean, input: string,
): boolean => {
  // This only filters already-authorized rows. It never changes RLS or data loading permissions.
  if (owner && (!onlyMine || isClientEmailSearch(input))) return true;
  return Boolean(currentUserId && client.user_id === currentUserId);
};
