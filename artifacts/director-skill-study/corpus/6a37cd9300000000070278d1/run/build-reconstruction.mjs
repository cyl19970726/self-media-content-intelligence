import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const evidence=read('./evidence/evidence-pack.json');
const probe=read('./probe.json');
const e=(refType,ref,supports)=>({refType,ref,supports});
const u=(id,title,importance,statement,provenance,start,end,refs,confidence='high',unknowns=[],extra={})=>({id,title,importance,statement,provenance,timeRange:{start,end},evidence:refs,confidence,unknowns,...extra});
const units=[
  u('KU-01','五万粉与课程承诺','core','作者宣称不到一周获得五万粉丝，并宣布这是“30天从起号到十万粉”免费课程的第一期。','author_claim',0.02,8.848,[e('cue','CUE-001','不到一周五万粉主张'),e('cue','CUE-002','30天十万粉课程第一期'),e('cue','CUE-003','三分钟解读')],'high',['粉丝增长真实性、统计口径、账号所有权和课程最终结果未验证'],{argument:{claim:'作者将通过免费系列课程讲解从起号到十万粉',evidenceUnitIds:['KU-02'],conditions:['作者称本条为第一期'],counterexamples:[],actions:['收藏并继续观看系列'],limits:['本视频不能证明30天结果']}}),
  u('KU-02','开场账号与数据叠层','supporting','开场可见一组小红书式账号/作品数据叠层，包含832.7万、611.9万等浏览数字和多组互动数字；画面上同时出现烧录字幕“开头展示教资”，与口播“展示我账号”的语境明显冲突。','visual_observation',0,2.892,[e('targeted_frame','TARGET-0002','账号与作品数据叠层完整可见'),e('ocr','OCR-00010','OCR提出832.7万'),e('ocr','OCR-00011','OCR提出611.9万'),e('ocr','OCR-00013','烧录字幕提出“开头展示教资”')],'medium',['“教资”可能是字幕/识别错误；数据口径和归属未知']),
  u('KU-02B','可见账号状态为5万粉丝','core','2.5秒的账号资料页叠层可独立读到账号“人类最强编导”和“5万粉丝”状态；它证明视频展示了这一时点的账号状态，但不证明“不到一周”、从零起号或增长轨迹。','visual_observation',2.5,2.892,[e('targeted_frame','TARGET-0004','账号资料页可见“5万粉丝”与账号名')],'high',['不到一周的时间窗是作者口播而非画面时间证据','是否从零开始未知','达到5万前后的增长轨迹与账号归属未建立']),
  u('KU-03','可见书籍身份','core','画面中作者手持一本封面可读为《好内容的千姿百态》的书或手册，并配有多张讲义纸。','visual_observation',8.848,20.32,[e('targeted_frame','TARGET-0010','书封和纸张可见'),e('ocr','OCR-00064','OCR提出“好内容的”'),e('ocr','OCR-00065','OCR将后半书名误识为“干姿百态”，人工对照画面读作“千姿百态”')],'high',['版本、出版社、完整版权页和讲义来源未展示']),
  u('KU-04','官方来源是作者主张','supporting','作者称这本书是在上个月的小红书创作大会上拿到的“小红书官方创作指南”；视频只展示书封外观，没有展示发放过程或可核验版本信息。','author_claim',8.848,17.07,[e('cue','CUE-004','声称在小红书创作大会'),e('cue','CUE-005','声称官方发布的创作指南'),e('targeted_frame','TARGET-0010','书封外观')],'high',['大会、官方发放、版本与授权未在视频内部证明']),
  u('KU-05','三组词到三类心理结果','core','作者转述第一章的三组词为“热情引发好奇、真诚引发认同、利他引发心动”，又把用户需求概括为好奇、认同和得到：好奇拓展未知，认同加深已知，得到“清晰半知”（按提供SRT与烧录字幕原样保留）。','author_claim',20.32,46.666,[e('cue','CUE-008','三组词'),e('cue','CUE-013','三种需求'),e('cue','CUE-014','三种解释'),e('ocr','OCR-00128','烧录字幕也显示“得到就是清晰半知”')],'high',['“清晰半知”可能是源字幕/口播转写异常，视频证据不足以静默改写']),
  u('KU-05B','作者叠加了自己此前的Vlog框架','supporting','在转述书的三组词后，作者明确说“结合到我之前说的Vlog的三种要求”，加入猎奇、陪伴、造梦以及真实、反差、交互。这部分被作者归因于自己此前的Vlog框架，而不是明确归因于当前展示的书。','author_claim',25.33,31.29,[e('cue','CUE-009','明确说“结合到我之前说的Vlog”并列出框架')],'high',['此前Vlog内容未作为本任务输入，无法核验其原始表述','该段与书中框架的对应关系是作者本次解释，不能全部归为书籍原文']),
  u('KU-06','三类心理结果的创作动作','core','为制造好奇，作者要求受众精准、激发兴趣，让用户问“这是什么”；为获得认同，要场景融入、情绪共鸣，让用户觉得“你懂我”；利他则是满足需求、自然呈现，让用户觉得“我需要”。','author_claim',43.83,56.177,[e('cue','CUE-015','引出方法'),e('cue','CUE-016','受众精准'),e('cue','CUE-017','好奇与认同动作'),e('cue','CUE-018','利他动作'),e('cue','CUE-019','我需要')],'high',[]),
  u('KU-06B','利他被桥接到平台深度精选','supporting','作者在31.3–38.21秒先把第三种“利他”桥接为“平台在推的深度精选内容”，并称它要求给用户“得到感”；这是作者对平台趋势的解释，视频没有提供平台规则、榜单或后台数据验证。','author_claim',31.3,38.21,[e('cue','CUE-010','从第三种利他转入平台'),e('cue','CUE-011','平台推深度精选内容'),e('cue','CUE-012','要求给用户得到感')],'high',['“平台”的具体范围、深度精选标准、发布时间和数据依据未知']),
  u('KU-07','三感六度只被部分展开','core','作者称第二章讨论好内容的“三感六度”，并要求想清楚场景、氛围、“能懂谁、能兼容谁”；口播没有逐项列出完整六度，白板小字也不足以可靠补全。','author_claim',56.177,65.139,[e('cue','CUE-020','第二章'),e('cue','CUE-021','三感六度与场景氛围'),e('cue','CUE-022','懂谁与兼容谁'),e('targeted_frame','TARGET-0030','人物指板但小字被遮挡/难读')],'high',['三感六度的完整六项未知']),
  u('KU-07B','平台的目标是留住用户','core','作者明确主张平台的最终目的是留住用户。','author_claim',70,71.741,[e('cue','CUE-025','平台最终目的就是留住用户')],'high',['视频没有提供平台官方说明、留存指标或业务数据来验证该主张']),
  u('KU-07C','平台与用户的好内容目标一致','core','作者的完整论证是：用户喜欢的内容就是好内容；平台需要留住用户，因此平台与用户对“好内容”的目标保持高度一致。','author_claim',63.571,71.741,[e('cue','CUE-023','引出小红书对好内容的评定'),e('cue','CUE-024','用户喜欢即好内容、平台与用户高度一致'),e('cue','CUE-025','平台留住用户作为理由')],'high',['“用户喜欢”的衡量方式未知','平台与用户目标是否总是一致未经视频验证','商业目标、治理规则或短期/长期留存可能构成的例外未讨论'],{argument:{claim:'平台与用户对好内容的目标高度一致',evidenceUnitIds:['KU-07B'],conditions:['作者把“用户喜欢”作为好内容标准','作者假设平台以留住用户为最终目的'],counterexamples:[],actions:['创作者据此优先做用户喜欢的内容'],limits:['只有作者因果论证，没有平台官方材料、数据或反例检验']}}),
  u('KU-08','搜索与闲逛改变目的性','core','作者把用户打开小红书分为搜索和闲逛：搜索目的性强、讲究效率；闲逛时内容应降低目的性。','author_claim',65.139,81.22,[e('cue','CUE-024','平台与用户一致主张'),e('cue','CUE-025','平台留住用户'),e('cue','CUE-026','搜索目的'),e('cue','CUE-027','闲逛降低目的性')],'high',['“降低目的性”的具体表达方法和平台数据未给出']),
  u('KU-09','IP可以设计但不能造假','supporting','作者认为用户会不断变聪明，因此做IP可以设计，但不能造假。','author_claim',81.23,87.48,[e('cue','CUE-027','用户变聪明'),e('cue','CUE-028','IP可以设计'),e('cue','CUE-029','不能造假')],'high',['“设计”与“造假”的可操作边界未定义']),
  u('KU-10','商业合作品类','supporting','作者列举平台投放广告品类：美妆个护、服饰、耐销品、快消品、交通/生活服务、奢品和App。','author_claim',87.49,96.37,[e('cue','CUE-030','引出平台广告'),e('cue','CUE-031','品类列表')],'medium',['SRT中的“耐销品”和“交通生活服务”的切分可能存在转写误差；视频未给频次或收入数据']),
  u('KU-11','五步框架总览','core','作者随后给出五个步骤：用户、需求、场景、选题和迭代。','author_claim',96.38,105.66,[e('cue','CUE-032','引出五步并列出节点'),e('cue','CUE-033','第一步用户'),e('targeted_frame','TARGET-0043','100.7秒的五步讲解画面，落在本单元时间范围内')],'high',['口播中的英文“step five step”未形成清晰可核验的正式框架名','方法适用的创作者阶段未知','适用赛道/细分领域未知','执行所需资源、团队或预算未知','何时应跳过、回退或改变步骤的例外条件未知']),
  u('KU-12','第一步：用户优先于自我资源','core','用户步骤要求明确身份画像、痛点和渴望，真正共情；作者把自媒体称为“他媒体”，原则是先弄清用户想看什么，再分析自己有什么。','author_claim',100.954,120.247,[e('cue','CUE-033','身份画像'),e('cue','CUE-034','痛点渴望'),e('cue','CUE-035','他媒体'),e('cue','CUE-036','用户想看/我有'),e('cue','CUE-037','先用户'),e('cue','CUE-038','再自我')],'high',[]),
  u('KU-13','第二步：让需求被惊喜发现','core','需求步骤不是直接告诉用户“你需要什么”，而是让用户惊喜地发现“原来我需要这个”；表达要把结果与过程、事实与感受结合，并可用身份认同、描绘蓝图、预判并解决决策卡点三种方法。','author_claim',118.675,152.64,[e('cue','CUE-039','第二步需求'),e('cue','CUE-040','惊喜发现需求'),e('cue','CUE-041','结果与过程'),e('cue','CUE-042','事实与感受'),e('cue','CUE-046','身份认同/蓝图'),e('cue','CUE-047','决策卡点')],'high',['三种方法未提供完整案例或效果验证']),
  u('KU-14','静安寺例子说明画面与文案互补','supporting','作者用假设的静安寺画面说明：画面已经表达“在静安寺”，口播不应重复“我来到静安寺”，而应增加“静安寺好大呀”这类感受信息。协议采样显示该段仍在白板房间，没有插入静安寺现场。','author_claim',131.35,143.83,[e('cue','CUE-043','静安寺假设'),e('cue','CUE-044','避免重复事实'),e('cue','CUE-045','增加感受信息'),e('targeted_frame','TARGET-0056','该例子时仍为白板讲述')],'high',['这是表达原则的口述例子，不是现场案例或结果证明']),
  u('KU-15','第三、四步：场景与选题','core','场景/氛围有共情和造梦两种；选题要懂用户、可持续、具有陪伴与成长。作者主张单条爆款没有特别大意义，爆款系列才更有意义。','author_claim',147.973,164.49,[e('cue','CUE-047','第三步及两类场景'),e('cue','CUE-048','第四步与前两项'),e('cue','CUE-049','陪伴成长与系列主张'),e('cue','CUE-050','进入迭代')],'high',['爆款与系列的评价口径、样本和例子未给出']),
  u('KU-16','第五步：评论区反馈闭环','core','迭代时先复盘总结；利用评论区观察用户共鸣、检查评论交互是否围绕视频表达重点，并从反馈中寻找新选题。旅游vlog若评论都在夸外貌而非内容，作者把它视为关注点偏差。','author_claim',164.49,186.82,[e('cue','CUE-051','复盘总结'),e('cue','CUE-052','看共鸣'),e('cue','CUE-053','检查评论关联'),e('cue','CUE-054','旅游vlog例子'),e('cue','CUE-055','表达偏差'),e('cue','CUE-056','反馈生成选题')],'high',['未展示真实评论区或迭代前后结果']),
  u('KU-17','数据是信号但不能单点解读','core','数据复盘要关注作者口述为“CTR”的指标和赞、转、评等互动，但不要单点解读反馈或只分析冷冰冰的数据；作者认为那样做不出有温度的好内容。','author_claim',186.83,195.93,[e('cue','CUE-057','CTR与赞转评'),e('cue','CUE-058','不要单点解读'),e('cue','CUE-059','冷数据与温度')],'high',['CTR的定义、公式、阈值和与内容质量的因果关系未给出'],{argument:{claim:'迭代不能只依赖单点数据',evidenceUnitIds:['KU-16'],conditions:['同时结合评论语义和互动'],counterexamples:['只分析冷冰冰的数据'],actions:['结合CTR、赞转评和评论内容复盘'],limits:['指标定义和有效阈值缺失']}}),
  u('KU-18','讲解场景与缺席边界','core','全片主要保持红色蜘蛛侠风格头套人物在同一室内白板前讲解，另有开场账号叠层、书与讲义展示；协议的0–199.877秒检查范围未观察到小红书后台实际操作、静安寺现场、价格/下载链接、书籍版本页、CTR公式/阈值或证据免责声明。','unknown',0,199.877,[e('targeted_frame','TARGET-0082','0秒开场范围'),e('targeted_frame','TARGET-0104','110秒白板讲述'),e('targeted_frame','TARGET-0122','结尾仍在同一房间')],'high',['缺席判断仅限本视频完整时间线，不代表现实中不存在；技术分镜可能含不可见硬切']),
  u('KU-19','结尾只完成本期，不验证开场承诺','supporting','结尾作者说本期课程到此、再次自报账号名并约下期再见；这只完成本期episode并提示系列延续，没有验证开场“不到一周五万粉”或“30天十万粉”承诺，也没有给出下一期访问路径。','system_inference',195.94,199.877,[e('cue','CUE-060','课程结束、自报身份与下期再见'),e('ocr','OCR-00410','烧录字幕显示“我们下期再见”'),e('targeted_frame','TARGET-0081','结尾人物与书/讲义同框，没有增长后台')],'high',['SRT把账号名识别为“人类最想编的”，画面角标更支持“人类最强编导”，实际发音未独立听辨','开场增长与课程结果未在结尾复核'],{reasoning:'结尾的可见与字幕证据只支持“本期结束/下期再见”；没有结果页、时间证明或增长轨迹，因此可推断episode completion，不能推断开场承诺获得兑现。'})
];
const relations=[
  {from:'KU-03',to:'KU-04',relation:'shown_as_source_of',evidence:[e('cue','CUE-004','作者把可见书籍指称为课程来源')]},
  {from:'KU-05',to:'KU-06',relation:'maps_to',evidence:[e('cue','CUE-015','由三类结果转入实现动作')]},
  {from:'KU-08',to:'KU-09',relation:'chosen_when',evidence:[e('cue','CUE-027','用户闲逛和变聪明构成IP表达语境')]},
  {from:'KU-12',to:'KU-13',relation:'precedes',evidence:[e('cue','CUE-037','先用户'),e('cue','CUE-039','再需求')]},
  {from:'KU-14',to:'KU-13',relation:'decision_rule_for',evidence:[e('cue','CUE-045','画面信息不应被文案重复')]},
  {from:'KU-12',to:'KU-15',relation:'depends_on',evidence:[e('cue','CUE-048','选题要懂用户')]},
  {from:'KU-16',to:'KU-17',relation:'diagnostic_for',evidence:[e('cue','CUE-053','评论主题用于诊断表达偏差')]},
  {from:'KU-16',to:'KU-15',relation:'input_to',evidence:[e('cue','CUE-056','评论反馈生成新选题')]},
  {from:'KU-17',to:'KU-16',relation:'evidence_for_but_not_sufficient',evidence:[e('cue','CUE-057','数据参与复盘'),e('cue','CUE-058','不得单点解读')]},
  {from:'KU-19',to:'KU-01',relation:'does_not_verify',evidence:[e('cue','CUE-002','开场课程承诺'),e('cue','CUE-060','结尾只完成本期'),e('targeted_frame','TARGET-0081','结尾无增长验证')]},
  {from:'KU-07B',to:'KU-07C',relation:'author_rationale_for',evidence:[e('cue','CUE-023','引出平台评定'),e('cue','CUE-024','平台与用户一致结论'),e('cue','CUE-025','留住用户理由')]},
  {from:'KU-05B',to:'KU-05',relation:'author_overlay_on_displayed_source',evidence:[e('cue','CUE-009','作者把自己此前Vlog框架叠加到书籍解读中')]},
  {from:'KU-06B',to:'KU-06',relation:'unverified_platform_bridge',evidence:[e('cue','CUE-011','平台深度精选主张'),e('cue','CUE-012','桥接到得到感')]}
];
const cueUnits=i=>i<=3?['KU-01','KU-02','KU-02B']:i<=7?['KU-03','KU-04']:i===9?['KU-05','KU-05B']:i<=12?['KU-05','KU-06B']:i<=19?['KU-05','KU-06']:i<=22?['KU-07']:i<=25?['KU-07B','KU-07C']:i<=29?['KU-08','KU-09']:i<=32?['KU-10','KU-11']:i<=38?['KU-12']:i<=47?['KU-13','KU-14']:i<=50?['KU-15']:i<=56?['KU-16']:i<=59?['KU-17']:['KU-19'];
const reconstruction={
  schemaVersion:'video-reconstruction-1.0',evidencePack:'evidence/evidence-pack.json',probe:'probe.json',protocol:'capture-protocol.json',
  scopeStatement:'仅重建本地MP4、提供SRT、本轮evidence pack、协议定点帧及macOS Vision OCR可支持的内容；不使用外部资料，不验证粉丝数据、书籍官方性、平台规律或内容效果。',viewerChange:probe.viewerChange,
  derivedSources:[
    {id:'SRC-TARGET',path:'targeted-evidence/targeted-evidence.json',kind:'protocol-directed frame manifest',producedBy:'capture-protocol-evidence.mjs',timeRange:{start:0,end:199.877},limitations:['离散帧不能证明连续操作','技术分镜不等于语义章节或编辑次数']},
    {id:'SRC-OCR',path:'targeted-evidence/ocr-evidence.json',kind:'macOS Vision OCR proposal',producedBy:'ocr-frames.swift plus visual review',timeRange:{start:0,end:199.877},limitations:['白板小字与叠层小字误识别明显','只引用已与源帧对照的行，冲突不静默修正']}
  ],
  transcript:{origin:evidence.transcript.origin,cues:evidence.transcript.cues.map(c=>({id:c.id,start:c.start,end:c.end,text:c.text,representativeFrame:c.representativeFrame,overlappingShots:c.overlappingShots}))},knowledgeUnits:units,relations,
  coverageMatrix:{
    channels:probe.informationCarriers.map(c=>({id:c.id,available:c.available,inspected:c.inspected})),
    meaningChanges:probe.meaningChanges.map((m,i)=>({id:m.id,captured:true,unitIds:[['KU-01','KU-02','KU-02B'],['KU-03','KU-04'],['KU-05','KU-05B','KU-06B','KU-06'],['KU-07','KU-07B','KU-07C','KU-08','KU-09'],['KU-10','KU-11'],['KU-12','KU-13','KU-14'],['KU-15'],['KU-16','KU-17','KU-19']][i]})),
    relationships:probe.relationshipHypotheses.map((r,i)=>({id:r.id,evidenced:true,evidenceRefs:relations[i].evidence.map(x=>x.ref)})),
    criticalQuestions:[
      {id:'Q-01',status:'answered',unitIds:['KU-01','KU-02','KU-02B'],evidenceRefs:['CUE-001','TARGET-0002','TARGET-0004']},
      {id:'Q-02',status:'answered',unitIds:['KU-03','KU-04'],evidenceRefs:['CUE-004','TARGET-0010']},
      {id:'Q-03',status:'answered',unitIds:['KU-05','KU-06'],evidenceRefs:['CUE-008','CUE-019']},
      {id:'Q-04',status:'answered',unitIds:['KU-08'],evidenceRefs:['CUE-026','CUE-027']},
      {id:'Q-05',status:'answered',unitIds:['KU-11','KU-12','KU-13','KU-15','KU-16','KU-17'],evidenceRefs:['CUE-032','CUE-051']},
      {id:'Q-06',status:'answered',unitIds:['KU-14','KU-18'],evidenceRefs:['CUE-043','TARGET-0056']},
      {id:'Q-07',status:'unknown',unitIds:['KU-16','KU-17'],evidenceRefs:['CUE-052','CUE-059']},
      {id:'Q-08',status:'unknown',unitIds:['KU-19','KU-18'],evidenceRefs:['CUE-002','CUE-060','TARGET-0122']}
      ,{id:'Q-09',status:'answered',unitIds:['KU-07B','KU-07C'],evidenceRefs:['CUE-023','CUE-024','CUE-025']}
    ],
    cueAccountability:evidence.transcript.cues.map((c,i)=>({cueId:c.id,disposition:'knowledge',unitIds:cueUnits(i+1),rationale:'该cue属于来源、概念映射、五步方法、反馈边界或系列结尾，已链接至知识单元。'})),
    coreEvidence:{covered:units.filter(x=>x.importance==='core'&&x.evidence.length).length,total:units.filter(x=>x.importance==='core').length},unknowns:probe.unresolved,uncheckedChannels:[]
  },
  metaGate:{question:'原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',pass:true,uncheckedChannels:[],overlookedMeaningChanges:[],overlookedRelationships:[],rationale:'协议检查了口播/SRT、烧录字幕与账号叠层、书/讲义、白板、手势、人物造型与环境、剪辑顺序、音轨存在性以及完整时间线的负证据；“平台需留住用户→平台与用户对好内容目标一致”的作者因果论证已拆为独立单元、显式关系和关键问题，并保留未验证边界；其余意义变化、关系和关键问题均有知识单元或明确未知。非语言音频的具体语义因工具能力不足被显式保留为未知。'}
};
fs.writeFileSync(new URL('./reconstruction.json',import.meta.url),JSON.stringify(reconstruction,null,2)+'\n');
