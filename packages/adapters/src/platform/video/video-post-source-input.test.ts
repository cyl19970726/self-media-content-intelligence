import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { runArtifactDir } from "../../core/config.js";
import { freezePostSourceInput } from "./video-post-source-input.js";
const roots: string[]=[];
afterEach(()=>{for(const root of roots.splice(0)) fs.rmSync(root,{recursive:true,force:true});});
function setup() { const id=randomUUID(), root=runArtifactDir(id);roots.push(root);fs.mkdirSync(root,{recursive:true});return {root,ref:`/artifacts/${id}/`}; }
describe("frozen post source",()=>{
  it("does not manufacture a title, media type, or cover from the video",()=>{
    const {root}=setup();const input=freezePostSourceInput({postExternalId:"p",sourceUrl:"https://example.com/p?token=secret"},root);
    expect(input.facts.mediaType).toBe("unknown");expect(input.facts.availability.overall).toBe("missing");expect(input.cover).toBeNull();expect(JSON.stringify(input)).not.toContain("secret");
  });
  it("copies and fingerprints only an available independent cover and rejects changed source on resume",()=>{
    const {root,ref}=setup();fs.writeFileSync(path.join(root,"cover.png"),"sample image bytes");
    fs.writeFileSync(path.join(root,"media.json"),JSON.stringify({items:[{externalId:"p",coverState:"ready",coverArtifactRef:ref+"cover.png"}]}));
    const request={postExternalId:"p",sourceUrl:"https://example.com/p",mediaManifestArtifactRef:ref+"media.json"};
    const input=freezePostSourceInput(request,root);expect(input.cover?.sha256).toHaveLength(64);expect(fs.existsSync(path.join(root,"post-cover.png"))).toBe(true);
    fs.writeFileSync(path.join(root,"cover.png"),"different");expect(()=>freezePostSourceInput(request,root)).toThrow("REVISION_CHANGED");
  });
  it("retains missing cover when a manifest refers to an absent file",()=>{
    const {root,ref}=setup();fs.writeFileSync(path.join(root,"media.json"),JSON.stringify({items:[{externalId:"p",coverState:"ready",coverArtifactRef:ref+"absent.png"}]}));
    expect(freezePostSourceInput({postExternalId:"p",sourceUrl:"https://example.com/p",mediaManifestArtifactRef:ref+"media.json"},root).facts.availability.cover).toBe("missing");
  });
});
