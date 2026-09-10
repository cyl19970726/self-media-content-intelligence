import fs from 'node:fs';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { runArtifactDir } from '../../packages/adapters/index.js';
import { projectOriginalReportMedia } from './original-report-media.js';
const id = '00000000-0000-4000-8000-000000000065';
const root = runArtifactDir(id);
afterEach(() => fs.rmSync(root, {recursive:true,force:true}));
it('projects existing legacy absolute and relative images without changing the report', () => {
  fs.mkdirSync(root, {recursive:true}); fs.writeFileSync(path.join(root,'frame.png'),'fixture');
  const source = `/Users/old/project/.runtime/runs/${id}/frame.png`;
  const markdown = `![图](${source})\n![另图](frame.png)`;
  expect(projectOriginalReportMedia(markdown, `/artifacts/${id}/`)).toEqual({[source]:`/artifacts/${id}/frame.png`,'frame.png':`/artifacts/${id}/frame.png`});
});
it('does not expose unrelated local files, traversal or unverified remote images', () => {
  expect(projectOriginalReportMedia('![图](/etc/passwd)\n![图](../../secret.png)\n![图](https://example.com/a.png)', `/artifacts/${id}/`)).toEqual({});
});
