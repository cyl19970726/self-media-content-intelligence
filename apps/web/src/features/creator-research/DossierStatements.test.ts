import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { StatementList } from './DossierStatements';
import type { CreatorDossier } from '../../shared/contracts/core';
it('keeps a synthesis claim and its boundary together with an actionable cited post', () => {
  const data = {canonicalId:'creator',run:{id:'current'},portfolio:{items:[{id:'post',title:'真实原帖',evidenceHref:'/creators/creator/videos/post?run=current'}]}} as CreatorDossier;
  const html = renderToStaticMarkup(createElement(MemoryRouter, {initialEntries:['/creators/creator?tier=high#tiers']}, createElement(StatementList, {data,empty:'',values:[{statement:'样本共同出现这一结构。',factClass:'inference',confidence:'medium',caveat:'关联不能证明因果。',evidenceRefs:['/artifacts/cited/video-reconstructions/post/reconstruction.json']}]})));
  expect(html).toContain('样本共同出现这一结构。');
  expect(html).toContain('关联不能证明因果。');
  expect(html).toContain('/creators/creator/videos/post?run=cited');
  expect(html).toContain('真实原帖');
  expect(html).toContain('run%3Dcurrent');
});
