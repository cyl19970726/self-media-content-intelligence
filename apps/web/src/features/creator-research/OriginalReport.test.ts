import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OriginalReport } from './OriginalReport';
import type { VideoResearch } from '../../shared/contracts/core';

const data = { frames: { dense: [{id:'TARGET-0001',src:'/artifacts/frame.jpg',time:1,reason:null}], sparse:[] }, transcript:[], evidenceIndex:[], sourceFacts:{coverHref:null} } as unknown as VideoResearch;
describe('original report reading', () => {
  it('preserves headings, transcript and qualifiers while resolving evidence beside the paragraph', () => {
    const html = renderToStaticMarkup(createElement(OriginalReport, { data, markdown:'# 标题\n\n不能证明效果（TARGET-0001）。\n\n## 完整逐字稿\n\n必须保留的原话。' }));
    expect(html).toContain('不能证明效果（TARGET-0001）。');
    expect(html).toContain('必须保留的原话。');
    expect(html).toContain('href="/artifacts/frame.jpg"');
  });
  it('retains unresolvable media and unsafe links as visible source text', () => {
    const html = renderToStaticMarkup(createElement(OriginalReport, {data, markdown:'![原图](/Users/missing.jpg)\n\n[链接](javascript:alert)'}));
    expect(html).toContain('原图');
    expect(html).toContain('图片来源未解析');
    expect(html).not.toContain('href="javascript:');
  });
});

import { evaluationReadingLabel } from './original-report-utils';
it('distinguishes unusable current evaluation from the original ready record', () => {
  expect(evaluationReadingLabel({...data,quality:{evaluationState:'failed',aggregateState:'ready'}} as VideoResearch)).toBe('当前三部分评估不可用');
});
it('renders projected original images without replacing their captions', () => {
  const html = renderToStaticMarkup(createElement(OriginalReport, {data:{...data, originalReportMedia:{'/Users/old.png':'/research/old.png'}}, markdown:'![原始限定](/Users/old.png)'}));
  expect(html).toContain('href="/research/old.png"');
  expect(html).toContain('原始限定');
});
it('keeps original transcript tables and resolves local frame links without false missing IDs', () => {
  const report = {...data, originalReportMedia:{'/Users/ACT-01-001.jpg':'/research/frame.jpg'}};
  const html = renderToStaticMarkup(createElement(OriginalReport, {data:report, markdown:'![图](/Users/ACT-01-001.jpg)\n\n| 逐字稿 | 证据 |\n| --- | --- |\n| 完整原话 | [查看帧](/Users/ACT-01-001.jpg) |'}));
  expect(html).toContain('<table>');
  expect(html).toContain('完整原话');
  expect(html.match(/href="\/research\/frame.jpg"/g)).toHaveLength(2);
  expect(html).not.toContain('来源未解析');
});
