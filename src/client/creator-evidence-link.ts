export function creatorEvidenceHref(evidenceHref: string, returnTo: string): string {
  const separator = evidenceHref.includes("?") ? "&" : "?";
  return `${evidenceHref}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
