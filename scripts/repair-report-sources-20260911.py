# Run from project root with SIGNAL_ROOM_EVIDENCE_ROOT set. Originals remain unchanged.
import json,hashlib,pathlib,copy,os,subprocess,tempfile
root=pathlib.Path.cwd(); store=root/'.runtime/report-revisions'; ledger=[]
def save(p, obj, reason):
 old=p.read_bytes(); new=(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode() if not isinstance(obj,str) else obj.encode()
 h=lambda b:hashlib.sha256(b).hexdigest()
 d=store/h(old);d.mkdir(parents=True,exist_ok=True)
 (d/'original-source').write_bytes(old);(d/'revised-source').write_bytes(new)
 m={'schemaVersion':'report-source-revision@1','revisionId':'source-review-20260911','originalPath':str(p),'originalSha256':h(old),'revisedSha256':h(new),'reason':reason,'evaluation':'not_revalidated','reviewScope':'既有转写及原帧局部复核，不是全片重新评估'}
 (d/'revision.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');ledger.append(m)
b=pathlib.Path(os.environ['SIGNAL_ROOM_EVIDENCE_ROOT'])/'view/artifacts/creator-research/zhang-zala-v1/videos'
p=b/'69d33c53000000001e00f5a3'/'skill-run';reason='限定转写覆盖，并恢复缺cue时段的可见字幕观察；完整声音仍未知'
probe=json.loads((p/'probe.json').read_text());probe['informationCarriers'][0]['name']='现存机器转写口播（含未转写时段）';probe['informationCarriers'][0]['roles'].append('81.45–94.45秒无机器cue；通道适用范围不代表逐字完整覆盖');save(p/'probe.json',probe,reason)
r=json.loads((p/'reconstruction.json').read_text());rationale='现存机器cue及既有采样画面已检查，不代表全片语义完整。81.45–94.45秒无机器cue；采样帧可恢复部分字幕观点，完整口播仍未知。64.56–81.45秒为长cue，内部时序未重新校准；末cue后内容未重新核对。当前修订未完成全片独立复核。'
r['metaGate']['rationale']=rationale;r['metaGate']['pass']=False
obs='在81.45–94.45秒没有机器转写cue的区间，采样画面的烧录字幕把 technical curiosity 表述为可以习得、并非天生或由既有标签限定的技能，随后出现“好奇者和动手实践者”。这些是可见字幕中的观点，不是补录的连续口播，也不代表已外部验证其真实性。'
u=copy.deepcopy(r['knowledgeUnits'][2]);u.update({'id':'KU-REVIEW-01','importance':'supporting','title':'转写缺口中的可见字幕观察','statement':obs,'provenance':'visual_observation','timeRange':{'start':81.45,'end':94.45},'reasoning':'独立复核现存TARGET帧；保留声音未知','unknowns':['完整准确口播及未采样内容'],'evidence':[{'refType':'targeted_frame','ref':ref,'supports':'采样帧上可读烧录字幕，不等同连续声音'} for ref in ['TARGET-0051','TARGET-0056','TARGET-0059']]});r['knowledgeUnits'].append(u)
save(p/'reconstruction.json',r,reason)
s=(p/'report.md').read_text().replace('## 完整机器逐字稿与证据映射','## 现存机器逐字稿与证据映射（保留缺口）')
old='完整机器口播、烧录字幕/OCR、视频特有画面载体、人物/布局和完整非语音混合轨均已检查；每个意义变化与相邻关系都映射到知识单元。剩余是已声明的外部可用性、权利、因果与效果未知。该内部自检不替代独立 reviewer。'
assert old in s;s=s.replace('Meta-gate：内部通过；'+old,'Meta-gate：本修订未完成全片复核；'+rationale)
s=s.replace('## 现存机器逐字稿','## 局部复核补充：缺cue时段的可见字幕\n\n'+obs+'（TARGET-0051、TARGET-0056、TARGET-0059）\n\n## 现存机器逐字稿');save(p/'report.md',s,reason)
p=b/'69eac78d000000002202b86e'/'skill-run';reason='删除AI阶段引用改为直接支持该主张的原cue及画面，保留机器转写'
probe=json.loads((p/'probe.json').read_text());stage=next(x for x in probe['meaningChanges'] if x['id']=='MC-05');stage['evidenceHints']=['CUE-061','CUE-062','CUE-063','CUE-064','TARGET-0075','TARGET-0076','TARGET-0077'];stage['trigger']='作者称使用好几天后未点AI整理，域名分组足够，因此提出删除；直接证据138.80–149.44秒，末句跨出原阶段边界0.44秒';save(p/'probe.json',probe,reason)
r=json.loads((p/'reconstruction.json').read_text())
for q in r['coverageMatrix'].get('criticalQuestions',[]):
 if q.get('id')=='CQ-05':q['evidenceRefs']=list(dict.fromkeys(q.get('evidenceRefs',[])+stage['evidenceHints']))
r['metaGate']['pass']=False;r['metaGate']['rationale']='本修订局部核对删除AI主张的cue和采样帧；未重新进行全片独立评估。';save(p/'reconstruction.json',r,reason)
s=(p/'report.md').read_text();s=s.replace('Meta-gate：内部通过；','Meta-gate：历史自检原记录（本修订未重新验证）；');s+='\n\n## 引用修订与可见字幕冲突\n\n删除AI主张的直接依据为CUE-061–064及TARGET-0075、TARGET-0076、TARGET-0077，支持作者自述未用、域名分组足够、提出删除；不证明代码删除已执行。CUE-061机器识别“好一天”，140秒画面字幕为“好几天”，原始cue未改。直接证据跨到149.44秒，不把阶段名义终点149秒当精确语义边界。本修订未重做全片评估。\n';save(p/'report.md',s,reason)
p=root/'.runtime/runs/00000000-0000-4000-8000-000000000908/video-reconstructions/6a8ae3190000000028022b9f';r=json.loads((p/'reconstruction.json').read_text());l=r['builderLenses'];stage=l['directingLogic']['stages'][2];stage['evidenceRefs']=['SHOT-003'];stage['payoff']='直接可见的结果样本；技术段起点不代表首次成果出现时间。';l['directingLogic']['loadAndPayoff']['payoffDistance']='41.425秒代表帧确认播放器样片可见，随后59.5秒起继续给更长样片；未据技术段起点判定首次语义出现。';l['visualEditing']['shotSemantics'][2]['evidenceRefs']=['SHOT-003'];l['visualEditing']['shotSemantics'][2]['role']='播放器结果样本';l['visualEditing']['resultFirstAt']=None
l['visualEditing']['notes']=[s for s in l['visualEditing']['notes'] if not s.startswith('resultFirstAt')]+['resultFirstAt未知：原38.15秒来自技术分段，不足以确立首次结果；本次回看38–42秒及41.425秒原帧，确认该段由工作流内预览过渡为放大播放。60秒TARGET-0017仅用于后续样片阶段。']
l['visualEditing']['transitions'][1]['function']='给出播放器结果样本；不据技术分段判定首次出现。'
save(p/'reconstruction.json',r,'移除跨段60秒引用；首次结果时间改为未知，保留41.425秒原帧支持的阶段结论')
with tempfile.TemporaryDirectory(prefix='report-revision-') as tmp:
 candidate=copy.deepcopy(r);candidate['evidencePack']=str((p/r['evidencePack']).resolve())
 source=pathlib.Path(tmp)/'reconstruction.json';article=pathlib.Path(tmp)/'article.md'
 source.write_text(json.dumps(candidate,ensure_ascii=False))
 title=(p/'article.md').read_text().splitlines()[0].removeprefix('# ')
 subprocess.run(['node',str(root/'.agents/skills/video-content-reconstruction/scripts/render-reconstruction-report.mjs'),'--reconstruction',str(source),'--targeted',str(p/'targeted-evidence/targeted-evidence.json'),'--title',title,'--out',str(article)],check=True)
 save(p/'article.md','> 源报告局部修订；未重新完成全片独立评估。\n\n'+article.read_text(),'同步已修订Builder原文，旧评估不适用于本修订')
(root/'.runtime/source-repair-20260911').mkdir(parents=True,exist_ok=True)
(root/'.runtime/source-repair-20260911/revision-ledger.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
print('Saved',len(ledger),'hash-bound source revisions; original files untouched')
