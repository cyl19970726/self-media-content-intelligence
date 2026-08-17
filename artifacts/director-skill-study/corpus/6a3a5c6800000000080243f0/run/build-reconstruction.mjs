import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const evidence = read('./evidence/evidence-pack.json');
const probe = read('./probe.json');
const e = (refType, ref, supports) => ({refType, ref, supports});
const u = (id,title,importance,statement,provenance,start,end,evidenceRefs,confidence='high',unknowns=[],extra={}) => ({id,title,importance,statement,provenance,timeRange:{start,end},evidence:evidenceRefs,confidence,unknowns,...extra});
const units = [
  u('KU-01','开场增长主张','core','作者宣称用五天、五条视频获得五万涨粉并达到一百万播放。','author_claim',0,2.676,[e('cue','CUE-001','保存作者的增长与播放量主张'),e('targeted_frame','TARGET-0002','显示编辑叠加的成长中心式成绩卡')],'high',['视频未独立验证统计口径、真实性或账号所有权'],{argument:{claim:'五天五条视频可获得五万涨粉和一百万播放',evidenceUnitIds:['KU-02'],conditions:[],counterexamples:[],actions:[],limits:['只有作者口播与叠加截图外观，不是独立验证']}}),
  u('KU-02','开场卡片的争议读数','supporting','开场确有账号风格成绩卡叠层；可独立确认的是账号式标识与作者口播中的“一百万播放量”边界。OCR提出的“粉丝量破5万”“5条视频涨粉5万”和日期读数均降为 disputed，不能作为独立视觉事实。','unknown',0.2,2.2,[e('targeted_frame','TARGET-0002','确认存在账号风格卡片叠层，但小字不足以独立定案'),e('cue','CUE-001','作者口播给出一百万播放量边界'),e('ocr','OCR-00010','争议OCR提出“粉丝量破5万”'),e('ocr','OCR-00012','争议OCR提出日期'),e('ocr','OCR-00014','争议OCR提出5条视频涨粉5万')],'low',['5万、5条视频与日期的卡片OCR均有争议；数据真实性、统计口径和账号归属未知']),
  u('KU-03A','他媒体原则：用户先于内容','core','作者在7.52–15.44秒先提出“自媒体的本质是他媒体”，据此把短视频目标定义为做用户想看的东西；第一步不是先想自己要讲什么，而是先锚定用户与用户需求。','author_claim',7.52,15.44,[e('cue','CUE-003','承接底层逻辑'),e('cue','CUE-004','自媒体本质是他媒体/做用户想看的东西'),e('cue','CUE-005','第一步锚定用户与需求')],'high',['视频没有给出验证用户需求的研究流程']),
  u('KU-03','内容先锚定用户需求','core','作者把目标用户描述为有涨粉、转型和商业化提升需求的博主，以及契合的素人和企业IP；其方法先找用户痛点与渴望，再选择“解决问题”而非“解决情绪”。','author_claim',13.121,34.26,[e('cue','CUE-006','目标用户画像'),e('cue','CUE-009','选择解决问题'),e('ocr','OCR-00070','烧录字幕显示“共情猎奇和得到”')],'high',['“三类需求”的SRT原文有误识别；烧录字幕支持“共情、猎奇和得到”这一读法'],{argument:{claim:'短视频应先锚定目标用户及需求，本账号选择解决问题',evidenceUnitIds:[],conditions:['目标受众为希望涨粉、转型或提升商业化的创作者'],counterexamples:['作者拒绝以解决情绪为本账号选择'],actions:['描述用户画像','识别痛点与渴望','选择需求类型'],limits:['未给出用户研究样本或验证方法']}}),
  u('KU-04','平台风向限定内容形式','core','作者主张主流平台正在推两分钟以上的深度视频，因此选择“不抓眼球要抓价值”的两分钟以上深度口播干货。','author_claim',30.793,45.386,[e('cue','CUE-012','平台风向主张'),e('cue','CUE-013','抓价值结论'),e('cue','CUE-014','形式选择'),e('ocr','OCR-00115','烧录字幕含“2分钟以上的深度”')],'high',['“主流平台”的具体平台、依据和时效未说明'],{argument:{claim:'平台风向支持两分钟以上深度内容',evidenceUnitIds:[],conditions:['作者所称当前主流平台环境'],counterexamples:[],actions:['采用两分钟以上深度口播干货'],limits:['视频没有平台数据或规则证据']}}),
  u('KU-04B','深度口播是被选择的输出形式','supporting','由上述平台判断，作者实际选择的形式是两分钟以上的深度口播干货，强调抓价值而非只抓眼球。','author_claim',42.06,45.386,[e('cue','CUE-013','抓价值'),e('cue','CUE-014','两分钟以上深度口播干货')],'high',['该选择的真实平台表现未在视频中验证']),
  u('KU-05','用免费价值换起号流量','core','作者为了更快起号，选择把原本需要付费的内容免费放出以换取流量，并明确“流量与赚钱不能什么都要”。','author_claim',50.17,60.12,[e('cue','CUE-016','起号目的'),e('cue','CUE-017','免费内容换流量'),e('cue','CUE-018','流量与赚钱的取舍')],'high',['未说明免费内容范围、转化路径或真实商业结果']),
  u('KU-06','拒绝恐吓式情绪话术','supporting','作者以“2026年普通人最大的风口是自媒体”和“2026年不会用AI自媒体就完蛋了”为自己不会说的反例，说明其解决问题而非制造情绪的定位。','author_claim',55.766,66.521,[e('cue','CUE-018','引出不会说的内容'),e('cue','CUE-019','风口话术反例'),e('cue','CUE-020','AI恐吓话术反例')],'high',[]),
  u('KU-07','IP由ID与视觉符号构成','core','作者说IP从ID开始，“人类最强编导”传达编导身份以及权威或狂的气质；画面中的红色蜘蛛侠风格头套与白板被作者明确列为视觉组成。','author_claim',66.521,79.22,[e('cue','CUE-021','IP从ID开始'),e('cue','CUE-022','ID传达编导信息'),e('cue','CUE-023','权威或狂的自我定位'),e('cue','CUE-024','头套与白板作为视觉符号'),e('targeted_frame','TARGET-0028','人物指向白板且头套完整可见')],'high',['头套的角色授权、人物真实身份和账号所有权均未建立']),
  u('KU-07B','头套与白板的可见外观','supporting','画面持续可见一名戴红色蜘蛛侠风格头套、持红笔的人物站在写满结构文字的白板前；这一外观支持视觉一致性，但不建立角色授权或人物身份。','visual_observation',0,142.036,[e('targeted_frame','TARGET-0001','开场人物、头套与白板'),e('targeted_frame','TARGET-0028','IP讲解时同一造型和环境'),e('targeted_frame','TARGET-0084','结尾仍保持同一造型与环境')],'high',['真实身份与授权未知']),
  u('KU-08','选题库来自持续积累','core','制作SOP首先建立选题库；作者称选题依靠日常积累，来源是大量阅读和刷短视频。','author_claim',79.22,88.477,[e('cue','CUE-025','进入SOP'),e('cue','CUE-026','建立选题库'),e('cue','CUE-028','日常积累'),e('cue','CUE-029','阅读与刷视频')],'high',['未展示选题库工具、字段或记录样例']),
  u('KU-09','白板大纲替代固定脚本','core','作者认为是否需要脚本没有标准答案；对自己而言不写完整脚本，只用白板梳理大纲，以求表达清晰、减少磕巴。','author_claim',86.748,96.375,[e('cue','CUE-030','提出是否需要脚本'),e('cue','CUE-031','没有标准答案'),e('cue','CUE-032','自己只需白板'),e('cue','CUE-033','梳理大纲'),e('cue','CUE-034','表达目标')],'high',['白板全部小字因距离与遮挡不能可靠转录']),
  u('KU-10','低设备门槛与立即剪辑','core','作者说拍摄没有高精尖设备，只用一台手机和麦克风；拿到素材后应立即剪辑，并以当前17点到19点前完成本视频作为自我时限。','author_claim',96.375,110.54,[e('cue','CUE-035','手机拍摄'),e('cue','CUE-036','麦克风与素材'),e('cue','CUE-037','立即剪辑和时间承诺'),e('targeted_frame','TARGET-0035','领夹麦可见、人物仍在白板前')],'high',['手机和麦克风型号未知；视频未证明19点前实际完成或发布']),
  u('KU-11','剪辑步骤压缩节奏','core','作者口述的简易剪辑链为：导入素材→使用“智能剪口播”→删除气口和废话→慢处加倍速→配快节奏BGM→做简单字幕→发布。','author_claim',110.54,125.01,[e('cue','CUE-039','导入素材'),e('cue','CUE-040','SRT原文“智能接口播”'),e('cue','CUE-041','删气口和废话'),e('cue','CUE-042','慢处倍速'),e('cue','CUE-043','BGM与字幕'),e('cue','CUE-044','发布'),e('ocr','OCR-00302','烧录字幕支持“智能剪口播的方式”')],'high',['剪辑软件、倍速值、BGM来源、字幕样式参数与每个操作的实际执行均未展示'],{procedural:{input:'手机与麦克风拍得的口播素材',actions:['导入素材','使用智能剪口播','删除气口和废话','在节奏慢处加倍速','配快节奏BGM','添加简单字幕','发布'],parameters:[],output:'作者所称信息密度高、节奏快且足够短的视频',beforeFrames:['TARGET-0038'],duringFrames:['TARGET-0041','TARGET-0042','TARGET-0043','TARGET-0044','TARGET-0045'],afterFrames:['TARGET-0047'],unknowns:['画面未出现剪辑软件UI或执行过程','具体参数和失败条件未知']}}),
  u('KU-12','SRT与烧录字幕的剪辑术语冲突','supporting','提供SRT在CUE-040写作“智能接口播”，但同一时段烧录字幕可读为“智能剪口播的方式”；重建采用后者解释，同时完整保留SRT原文。','system_inference',114.71,115.94,[e('cue','CUE-040','保留冲突的SRT原文'),e('targeted_frame','TARGET-0042','同一时刻烧录字幕可见'),e('ocr','OCR-00302','OCR高置信提出“智能剪口播的方式”')],'high',['无法用当前文本证据验证实际发音'],{reasoning:'同一时间点的烧录字幕在源帧中可独立读到“智能剪口播”，且Vision OCR高置信复现；因此将其作为更受视觉证据支持的解释，但不覆盖原始SRT，也不推断实际发音。'}),
  u('KU-13','发布时间的两种决策法','core','作者给出两种发布时间方法：查看后台显示的播放活跃时间并选择该时段，或采用其推荐的晚上七点。','author_claim',122.35,131.66,[e('cue','CUE-044','引出发布时间'),e('cue','CUE-045','后台活跃时间'),e('cue','CUE-046','七点建议')],'high',['后台指标名称、所属平台和计算方式未展示']),
  u('KU-14','七点建议的作者理由','supporting','作者以“饥饿时耐心差、七点多数人已吃饱”为理由，推测观众更宽容，从而点赞与完播率可能上升。','author_claim',127.67,137.184,[e('cue','CUE-046','心理学引入'),e('cue','CUE-047','饥饿与耐心主张'),e('cue','CUE-048','七点吃饱主张'),e('cue','CUE-049','点赞与完播率推测')],'high',['心理学来源、适用人群、平台、时区和效果数据均未提供'],{argument:{claim:'晚上七点发布可能提高点赞与完播率',evidenceUnitIds:[],conditions:['作者假设多数受众七点已吃饭且更有耐心'],counterexamples:[],actions:['优先用后台活跃时段，或尝试19点'],limits:['无研究引用或结果验证，不能外推为普遍规律']}}),
  u('KU-15','口述而非软件演示','core','在协议覆盖的完整时间线中，除开场成绩卡叠层外，画面主要是同一人物在室内白板前讲述；未观察到剪辑软件UI、剪辑动作、设备型号、价格/链接、下载入口或结果验证。','unknown',0,142.036,[e('targeted_frame','TARGET-0055','全片0秒范围检查'),e('targeted_frame','TARGET-0077','110秒仍为白板口播'),e('targeted_frame','TARGET-0084','结尾仍为白板口播')],'high',['这是0–142.036秒检查范围内的未观察，不代表这些信息在现实中不存在']),
  u('KU-16','结尾只完成本期，不验证开场指标','supporting','结尾作者再次自称“人类最强编导”并说下期再见，完成本期SOP讲述；结尾没有重新展示后台或结果，不能作为开场“五万涨粉/一百万播放”指标的验证或 payoff。','system_inference',137.184,142.036,[e('cue','CUE-050','身份签名与课程收束'),e('cue','CUE-051','下期再见'),e('ocr','OCR-00384','烧录字幕显示“我们下期再见”'),e('targeted_frame','TARGET-0084','结尾仍为白板口播，没有结果后台')],'high',['未见下期访问链接，也未见对开场增长指标的复核'],{reasoning:'结尾证据只包含身份签名和告别；协议结尾帧未出现成绩卡或后台，因此可推断“本期结束”，但不能推断开场指标获得验证。'})
];
const relations = [
  {from:'KU-03',to:'KU-05',relation:'chosen_when',evidence:[e('cue','CUE-009','解决问题型内容由用户需求选择')]},
  {from:'KU-04',to:'KU-04B',relation:'framed_as_causing_choice',evidence:[e('cue','CUE-012','平台风向触发形式选择')]},
  {from:'KU-05',to:'KU-01',relation:'author_claims_produces',evidence:[e('cue','CUE-017','免费价值被主张为换流量的方法')]},
  {from:'KU-07',to:'KU-07B',relation:'expressed_by',evidence:[e('cue','CUE-024','IP定位由头套与白板表达')]},
  {from:'KU-08',to:'KU-09',relation:'precedes',evidence:[e('cue','CUE-026','先建选题库'),e('cue','CUE-033','再梳理大纲')]},
  {from:'KU-10',to:'KU-11',relation:'precedes',evidence:[e('cue','CUE-036','拍得素材后转剪辑')]},
  {from:'KU-11',to:'KU-10',relation:'author_claims_produces',evidence:[e('cue','CUE-038','目标是信息密度'),e('cue','CUE-043','剪辑动作组合')]},
  {from:'KU-13',to:'KU-14',relation:'decision_rule_for',evidence:[e('cue','CUE-046','七点是发布时间备选')]},
  {from:'KU-16',to:'KU-01',relation:'does_not_verify',evidence:[e('cue','CUE-001','开场指标主张'),e('cue','CUE-050','结尾仅身份签名'),e('targeted_frame','TARGET-0084','结尾未见指标后台')]}
];
const cueUnits = i => i<=2?['KU-01','KU-02']:i<=5?['KU-03A']:i<=9?['KU-03']:i<=15?['KU-04']:i<=20?['KU-05','KU-06']:i<=24?['KU-07']:i<=34?['KU-08','KU-09']:i<=38?['KU-10']:i<=44?['KU-11','KU-12']:i<=46?['KU-13']:i<=49?['KU-14']:['KU-16'];
const reconstruction = {
  schemaVersion:'video-reconstruction-1.0',evidencePack:'evidence/evidence-pack.json',probe:'probe.json',protocol:'capture-protocol.json',
  scopeStatement:'仅重建本地MP4、提供SRT、本轮evidence pack、动态协议采样帧及其macOS Vision OCR所能支持的内容；未使用外部来源，不验证作者增长、平台或心理学主张。',
  viewerChange:probe.viewerChange,
  derivedSources:[
    {id:'SRC-TARGET',path:'targeted-evidence/targeted-evidence.json',kind:'protocol-directed frame manifest',producedBy:'capture-protocol-evidence.mjs',timeRange:{start:0,end:142.036},limitations:['离散帧不能证明连续实时操作','多个人物运动造成的技术切点不等同语义场景']},
    {id:'SRC-OCR',path:'targeted-evidence/ocr-evidence.json',kind:'macOS Vision OCR proposal',producedBy:'ocr-frames.swift plus visual review',timeRange:{start:0,end:142.036},limitations:['白板小字和叠层小字识别不稳定','仅引用已对照源帧检查的OCR行']}
  ],
  transcript:{origin:evidence.transcript.origin,cues:evidence.transcript.cues.map(c=>({id:c.id,start:c.start,end:c.end,text:c.text,representativeFrame:c.representativeFrame,overlappingShots:c.overlappingShots}))},
  knowledgeUnits:units,relations,
  coverageMatrix:{
    channels:probe.informationCarriers.map(c=>({id:c.id,available:c.available,inspected:c.inspected})),
    meaningChanges:probe.meaningChanges.map((m,i)=>({id:m.id,captured:true,unitIds:[["KU-01","KU-02"],["KU-03A","KU-03"],["KU-04"],["KU-05","KU-06"],["KU-07"],["KU-08","KU-09"],["KU-10","KU-11","KU-12"],["KU-13","KU-14","KU-16"]][i]})),
    relationships:probe.relationshipHypotheses.map((r,i)=>({id:r.id,evidenced:true,evidenceRefs:relations[i].evidence.map(x=>x.ref)})),
    criticalQuestions:[
      {id:'Q-01',status:'answered',unitIds:['KU-01','KU-02'],evidenceRefs:['CUE-001','TARGET-0002']},
      {id:'Q-02',status:'answered',unitIds:['KU-03A','KU-03','KU-04','KU-05','KU-07'],evidenceRefs:['CUE-004','CUE-005','CUE-024']},
      {id:'Q-03',status:'answered',unitIds:['KU-08','KU-09','KU-10','KU-11','KU-15'],evidenceRefs:['CUE-025','CUE-049','TARGET-0077']},
      {id:'Q-04',status:'answered',unitIds:['KU-07'],evidenceRefs:['CUE-021','CUE-024','TARGET-0028']},
      {id:'Q-05',status:'unknown',unitIds:['KU-11','KU-15'],evidenceRefs:['CUE-035','CUE-043','TARGET-0077']},
      {id:'Q-06',status:'unknown',unitIds:['KU-13','KU-14'],evidenceRefs:['CUE-045','CUE-049']},
      {id:'Q-07',status:'answered',unitIds:['KU-01','KU-16'],evidenceRefs:['CUE-001','CUE-050','CUE-051']}
    ],
    cueAccountability:evidence.transcript.cues.map((c,i)=>({cueId:c.id,disposition:'knowledge',unitIds:cueUnits(i+1),rationale:'该cue构成作者决策链、步骤、边界或结尾闭环，已链接到对应知识单元。'})),
    coreEvidence:{covered:units.filter(x=>x.importance==='core'&&x.evidence.length>0).length,total:units.filter(x=>x.importance==='core').length},
    unknowns:probe.unresolved,
    uncheckedChannels:[]
  },
  metaGate:{question:'原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',pass:true,uncheckedChannels:[],overlookedMeaningChanges:[],overlookedRelationships:[],rationale:'协议覆盖口播/SRT、烧录字幕和叠层、白板、手势、人物造型与环境、剪辑顺序、音轨存在性以及全片负证据；所有意义变化、关键问题和关系均已捕捉或明确标为未知。非语言音频的具体语义超出可用检查能力，已作为显式未知而非遗漏。'}
};
fs.writeFileSync(new URL('./reconstruction.json',import.meta.url),JSON.stringify(reconstruction,null,2)+'\n');
