import { expect, it } from 'vitest';
import { statementSources, sampleRoleLabel, canonicalCreatorHref, singlePostReturnHref } from './creator-reading';
import type { CreatorDossier } from '../../../shared/contracts/core';
const items = [{id:'post',title:'原始标题',evidenceHref:'/creators/creator/videos/post?run=old',sourceHref:'https://example.com'}] as CreatorDossier['portfolio']['items'];
it('opens the report revision cited by a synthesis even if the portfolio uses a newer run', () => {
  expect(statementSources(['/artifacts/abc-123/video-reconstructions/post/reconstruction.json'],items,'/creators/creator?run=old#tiers')[0]?.href).toContain('run=abc-123');
});
it('does not invent links for unresolved evidence identifiers', () => {
  expect(statementSources(['unknown-ref'],items,'/creators/creator')[0]?.href).toBeNull();
});
it('distinguishes mean-near selection from the performance tier', () => {
  expect(sampleRoleLabel({anchors:['mean_near'],deepSample:true,tier:'high'} as typeof items[number])).toBe('均值附近');
});
it('preserves explicit run selection and filters when canonicalizing a dossier URL', () => {
  expect(canonicalCreatorHref('creator','old','?tier=low')).toBe('/creators/creator?tier=low&run=old');
  expect(singlePostReturnHref('creator','old',null)).toBe('/creators/creator?run=old#portfolio');
});
