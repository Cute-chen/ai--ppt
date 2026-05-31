export const maskSecret = (raw: string): string => {
  if (!raw) return '';
  if (raw.length <= 6) return '*'.repeat(raw.length);
  return `${raw.slice(0, 3)}***${raw.slice(-3)}`;
};
