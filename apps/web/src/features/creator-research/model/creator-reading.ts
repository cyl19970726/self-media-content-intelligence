import type { CreatorDossier } from '../../../shared/contracts/core';
import { creatorEvidenceHref } from './creator-evidence-link';
type Item = CreatorDossier['portfolio']['items'][number];

export function sampleRoleLabel(item: Item) {
  const labels = item.anchors.filter(anchor => anchor !== 'typical_form').map(anchor => anchor === 'median_near' ? '中位附近' : '均值附近');
  return labels.join(' / ') || (item.deepSample ? item.tier === 'high' ? '高表现代表' : item.tier === 'low' ? '低表现代表' : '基本盘代表' : '作品级样本');
}

export function canonicalCreatorHref(id: string, run: string, search: string) {
  const params = new URLSearchParams(search); params.set('run',run);
  return `/creators/${encodeURIComponent(id)}?${params}`;
}

export function singlePostReturnHref(creatorId: string, run: string | undefined, returnTo: string | null) {
  const base = `/creators/${encodeURIComponent(creatorId)}`;
  if (returnTo && [base, ...(run ? [`/creators/${encodeURIComponent(run)}`] : [])].some(prefix => returnTo === prefix || returnTo.startsWith(`${prefix}?`) || returnTo.startsWith(`${prefix}#`))) return returnTo;
  return `${base}${run ? `?run=${encodeURIComponent(run)}` : ''}#portfolio`;
}

export function statementSources(refs: string[], items: Item[], returnTo: string) {
  return [...new Set(refs)].map(ref => {
    const rawHref = /^(\/artifacts\/|\/research\/|https?:\/\/)/.test(ref) ? ref : ref.startsWith('artifact:') ? `/research/${ref.slice(9)}` : null;
    const post = ref.match(/\/(?:video-reconstructions|videos)\/([^/]+)\//)?.[1];
    const item = items.find(candidate => candidate.id === post);
    if (item?.evidenceHref) {
      const [pathname, query] = item.evidenceHref.split('?');
      const params = new URLSearchParams(query);
      const citedRun = ref.match(/^\/artifacts\/([^/]+)\//)?.[1];
      if (citedRun) params.set('run', citedRun);
      return { ref, label: item.title, href: creatorEvidenceHref(`${pathname}?${params}`,returnTo), rawHref };
    }
    return {ref, label: rawHref ? `原始记录 · ${ref.split('/').at(-1)}` : `${ref} · 来源未解析`, href:rawHref, rawHref};
  });
}
