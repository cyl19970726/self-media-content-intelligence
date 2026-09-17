export function creatorEvidenceHref(evidenceHref: string, returnTo: string): string {
  const hashIndex = evidenceHref.indexOf("#");
  const base = hashIndex === -1 ? evidenceHref : evidenceHref.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : evidenceHref.slice(hashIndex);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}returnTo=${encodeURIComponent(returnTo)}${hash}`;
}

export function crossPostReturnTo(returnTo: string, anchor: string): string {
  if (returnTo.startsWith("/workflow-runs/") && returnTo.includes("#")) return returnTo;
  return `${returnTo}#${anchor}`;
}
