export const normalizeEmail = (email?: string | null): string => {
  return email?.trim().toLowerCase() ?? '';
};

export const normalizeEmailOrUndefined = (
  email?: string | null,
): string | undefined => {
  const normalized = normalizeEmail(email);
  return normalized || undefined;
};
