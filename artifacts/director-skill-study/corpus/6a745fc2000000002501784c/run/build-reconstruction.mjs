import fs from 'node:fs';
const run = new URL('.', import.meta.url).pathname;
const pack = JSON.parse(fs.readFileSync(new URL('../evidence/evidence-pack.json', import.meta.url)));
const probe = JSON.parse(fs.readFileSync(new URL('probe.json', import.meta.url)));
const ev=(refs,supports)=>refs.map(ref=>({refType:ref.startsWith('CUE-')?'cue':ref.startsWith('SHOT-')?'shot':ref.startsWith('TARGET-')?'targeted_frame':ref.startsWith('OCR-')?'ocr':'frame',ref,supports}));
const U=(id,title,statement,start,end,refs,{importance='core',provenance='author_claim',confidence='high',unknowns=[],reasoning}={})=>({id,title,importance,statement,provenance,timeRange:{start,end},evidence:ev(refs,statement),confidence,...(reasoning?{reasoning}:{}),unknowns});
const units=[
  U('KU-OPEN-INSERT','开头插入画面','0至1.133秒先出现一段模糊插入画面，烧录字幕为“开头展示教程”；视频内部未给出该片段来源、作者或权属。',0,1.133,['SHOT-001','CUE-001','FRAME-CUE-001'],{provenance:'visual_observation',importance:'supporting',unknowns:['插入画面的原始来源、作者、授权和权属']}),
  U('KU-SETUP','仿考试讲评设定','约1.133秒后转入“2026年普通高等自媒体全国统一考试”的仿试卷讲评；讲解者自称出题人。',1.133,10.782,['SHOT-002','CUE-003','CUE-004','FRAME-CUE-003'],{provenance:'author_claim'}),
  U('KU-VISUAL','固定视觉构图','主画面持续显示一张试卷，右下角为戴红色蜘蛛侠式面罩、穿灰色上衣的出镜者画中画；卷面红色圈画与手写答案逐步增多。',0,218.082,['FRAME-SHOT-001','FRAME-SHOT-002','FRAME-SHOT-003','TARGET-0049','TARGET-0050','TARGET-0051'],{provenance:'visual_observation',importance:'supporting',unknowns:['出镜者真实身份、面罩角色授权、批注是否连续无隐藏剪辑均未建立']}),
  U('KU-LABEL','可见账号与平台标签','画面可读到“人类最强编导”账号标签和小红书水印。',0,218.082,['OCR-00190','TARGET-0055','FRAME-CUE-001'],{provenance:'visual_observation',importance:'context',unknowns:['水印不证明素材权属或账号运营主体身份']}),
  U('KU-Q01','第1题：更新与养号','作者选择B：更新频率没有统一标准，但不能长期断更；并把大量所谓“养号/活跃”说法斥为骗局。',10.782,26.023,['CUE-006','CUE-008','CUE-009','CUE-010','TARGET-0007'],{unknowns:['没有给出长期断更的量化阈值或平台依据']}),
  U('KU-Q02','第2题：推流变化后的内容逻辑','作者称主要推流周期从24小时延长到约7天，并选择B，主张平台更喜欢深度、有价值的内容。',26.023,36.35,['CUE-011','CUE-012','CUE-013','TARGET-0009','TARGET-0010'],{unknowns:['平台名称、政策时间、数据来源和外部真实性未建立']}),
  U('KU-Q03','第3题：创作立场','作者否定只按个人喜好、忽略用户与平台的做法，选择C，并主张结合现有资源、用户需求和平台偏好创作。',36.35,54.896,['CUE-014','CUE-015','CUE-017','CUE-018','CUE-019','CUE-020','TARGET-0011','TARGET-0012'],{unknowns:['SRT中的“他媒体”是否准确未建立']}),
  U('KU-Q04','第4题：六类用户需求','作者把“养号活跃”排除在其六类用户需求之外，并列出审美、共鸣、成长、猎奇、情绪和解决问题。',54.896,69.31,['CUE-021','CUE-022','CUE-023','CUE-024','TARGET-0013','TARGET-0015'],{unknowns:['分类来源、定义和适用边界未说明']}),
  U('KU-Q05','第5题：Vlog特征','作者选择A，称平台当前偏好的Vlog具有真实、反差和交互三个特征。',69.31,74.86,['CUE-025','TARGET-0016'],{unknowns:['平台、样本与“当前”的具体时间未说明']}),
  U('KU-Q06','第6题：百万爆款必要条件','作者选择D为非必要项，并称A/B/C对应三项必要条件：用户能看懂、理解成本低且能连接足够大群体；能调动情绪；能满足获得信息的需求。',74.86,87.99,['CUE-026','CUE-027','CUE-028','TARGET-0017','TARGET-0018'],{unknowns:['D选项具体文字没有在SRT中保留','“必要条件”的普适性未被所示例证证明']}),
  U('KU-Q07','第7题：三种爆款类型','作者选择A并列出三种类型；SRT把首项记为“万古同杯”，可见烧录字幕更像“万古同悲”，其准确术语保留冲突；后两项为惊世骇俗和打破节奏型。',87.99,97.483,['CUE-029','CUE-030','FRAME-CUE-030','TARGET-0019'],{provenance:'system_inference',confidence:'medium',reasoning:'SRT原词与可见烧录字幕字形不一致，不能静默归一。',unknowns:['首类型准确文字未完全可靠确认']}),
  U('KU-Q08','第8题：AI使用边界','作者排斥AI直接生成全部脚本并包办拍摄、替代创作者“对人类的贡献”以及保证每条内容爆款；认可用AI补齐知识缺陷并参与一种SRT记为“通道风暴”的活动。',97.483,114.62,['CUE-032','CUE-034','CUE-035','CUE-036','CUE-037','TARGET-0020','TARGET-0023'],{unknowns:['“通道风暴”疑似ASR错误，准确原词可能是头脑风暴但画面不足以可靠纠正','未给出工具、提示词或操作流程']}),
  U('KU-TRANSITION','由选择题转到填空题','作者称选择题结束，转入更严肃的填空题基本功考察；卷面视区随之移向下半部分。',114.62,122,['CUE-038','CUE-039','TARGET-0025','TARGET-0026','TARGET-0027'],{provenance:'visual_observation',importance:'supporting'}),
  U('KU-Q09','第9题：推流周期填空','作者再次填写主要推流周期由24小时延长到约7天。',119.96,129.99,['CUE-040','CUE-041','TARGET-0028','TARGET-0029'],{unknowns:['与第2题相同，平台、政策时间和来源未建立']}),
  U('KU-Q10','第10题：导演扶持计划内容类型','印刷题面只可靠显示“AI短片、[空缺]和微纪录片”；SRT在空缺附近出现“什么何为纪录片，人间观察”的噪声，不能据此补全中间类型。',125.48,133.91,['CUE-041','CUE-042','FRAME-CUE-042','TARGET-0029','TARGET-0030'],{provenance:'system_inference',confidence:'medium',reasoning:'核对印刷题面与SRT后，仅首项、空缺结构及末项可安全闭合；中间类型保持未知。',unknowns:['导演扶持计划的中间内容类型','所属平台、资格、入口与政策原文']}),
  U('KU-Q11','第11题：六类需求重述','作者再次列出审美、共鸣、成长、猎奇、情绪和解决问题六类需求，并说前面已讲过而不再书写。',133.91,141.79,['CUE-043','CUE-044','CUE-045','TARGET-0031','TARGET-0032'],{unknowns:['分类仍仅为作者主张']}),
  U('KU-Q12','第12题：投流边界','作者用“投流只负责锦上添花，不负责雪中送炭”概括投流作用。',141.79,147.07,['CUE-046','TARGET-0033'],{unknowns:['未说明平台、预算、投放目标或证据']}),
  U('KU-Q13','第13题：Vlog IP四个观察维度','作者列出打造Vlog中IP的四个观察维度：SRT记为“刻板、行为作风、个人风格和IP立体度”。',147.07,152.86,['CUE-047','CUE-048','TARGET-0034','TARGET-0035'],{unknowns:['首项及四项断句可能受SRT影响，卷面小字不足以可靠校正','四维度定义未展开']}),
  U('KU-Q14','第14题：Vlog两种类型','作者把Vlog分为日常型与挑战型；日常型是“有啥拍啥”的软素材，挑战型是为了拍Vlog特意去做某事的硬素材。',152.86,162.885,['CUE-049','CUE-050','CUE-051','CUE-052','TARGET-0035','TARGET-0037'],{unknowns:['二分法的适用范围与混合类型未讨论']}),
  U('KU-Q15','第15题：爆款三类型重述','作者再次列举三种爆款类型；SRT此处把首项记为“灌骨铜杯”，烧录字幕更像“万古同悲”，后两项为惊世骇俗和节奏打破型。',162.885,169.552,['CUE-053','CUE-054','FRAME-CUE-054','TARGET-0038','TARGET-0039'],{provenance:'system_inference',confidence:'medium',reasoning:'同一术语在两段SRT中不同且与烧录字幕字形冲突。',unknowns:['首类型准确文字未确定','“打破节奏型/节奏打破型”是否同一规范名称未说明']}),
  U('KU-Q16','第16题：从自身找爆款选题','作者要求检查三类自身要素：自己做过或能做而多数人做不到的事；自己特别大的优点和缺点；自己极度擅长的事。',169.552,177.61,['CUE-055','CUE-056','CUE-057','CUE-058','TARGET-0040','TARGET-0041'],{unknowns:['未提供评价或验证选题的方法']}),
  U('KU-Q17','第17题：追热点判断','作者称追热点要判断“有没有”和“能不能”，并应据事实判断能否及时跟进，否则翻车的代价可能比流量反噬更大。',177.61,187.35,['CUE-059','CUE-060','CUE-061','TARGET-0042','TARGET-0043'],{unknowns:['“有没有/能不能”的完整宾语与具体核验流程未建立']}),
  U('KU-Q18','第18题：文本表达三要求','作者称文本表达要达到三个要求；SRT记录为“一是能等，二是练字，三是网感”，但这些词的准确性未获清晰画面支持。',187.35,193,['CUE-062','FRAME-CUE-062','TARGET-0044'],{provenance:'raw_fact',confidence:'medium',unknowns:['三项术语的准确文字和含义未可靠建立']}),
  U('KU-Q19','第19题：自媒体赛道分类','作者把自媒体赛道分为口播和非口播两大类；口播包括情感、成长、厚黑、干货，非口播包括Vlog、短片、AIGC、微综艺和颜值。',193,202.87,['CUE-063','CUE-064','TARGET-0045','TARGET-0046'],{unknowns:['分类是否互斥、是否穷尽及适用平台未说明']}),
  U('KU-Q20','第20题：爆款系列生命周期','作者称一个爆款系列通常有3到6个月生命周期；系列疲软时应及时优化调整，或考虑变现。',202.87,210.52,['CUE-065','CUE-066','TARGET-0047','TARGET-0048'],{unknowns:['生命周期数据来源、样本与变现条件未说明']}),
  U('KU-CLOSE','考试设定的结尾回扣与口头署名','作者称试卷较基础，90分以上的观众可以准备拿到“自媒体的大结果”，随后口头说“我是雷自强编导”并告别。',210.52,218.082,['CUE-067','CUE-068','CUE-069','TARGET-0053','TARGET-0055'],{provenance:'author_claim',unknowns:['“大结果”的标准、保证程度与依据未说明','口头自报名不证明法定身份']}),
  U('KU-CLOSE-IDENTITY-BOUNDARY','结尾口头名与可见账号标签不可互换','结尾口头自报名是“雷自强编导”，同时画面账号/文档标签仍为“人类最强编导”；视频未证明二者在法律、账号运营或文档归属上的同一性。',215.275,218.082,['CUE-069','OCR-00190','TARGET-0055'],{provenance:'system_inference',importance:'supporting',reasoning:'口头自报名与可见账号标签是两个独立载体；仅凭同时出现不能推导法律身份、账号主体或文档归属同一。',unknowns:['“雷自强编导”与“人类最强编导”的主体对应关系']}),
  U('KU-ABSENCE','完整时间线内未建立的决策边界','在已检查的0至218.082秒字幕、试卷、批注、人物画中画、水印和结尾范围内，未观察到试卷获取CTA、明确平台政策出处、价格、账号条件、地区或外部数据来源。',0,218.082,['SHOT-001','SHOT-002','SHOT-003','TARGET-0049','TARGET-0051','TARGET-0056'],{provenance:'visual_observation',importance:'supporting',unknowns:['这是范围限定的未观察结果，不证明这些信息在视频外不存在']}),
  U('KU-AUDIO','非语音音频边界','媒体文件包含AAC音轨，但现有文本与帧证据不足以可靠确定背景音乐、音效或其来源与叙事作用。',0,218.082,['SHOT-001','SHOT-003'],{provenance:'unknown',importance:'context',confidence:'low',unknowns:['非语音音频语义、来源与权属']})
];
const mapCue=n=> n<=5?'KU-SETUP':n<=10?'KU-Q01':n<=13?'KU-Q02':n<=20?'KU-Q03':n<=24?'KU-Q04':n===25?'KU-Q05':n<=28?'KU-Q06':n<=30?'KU-Q07':n<=37?'KU-Q08':n<=39?'KU-TRANSITION':n<=41?'KU-Q09':n===42?'KU-Q10':n<=45?'KU-Q11':n===46?'KU-Q12':n<=48?'KU-Q13':n<=52?'KU-Q14':n<=54?'KU-Q15':n<=58?'KU-Q16':n<=61?'KU-Q17':n===62?'KU-Q18':n<=64?'KU-Q19':n<=66?'KU-Q20':'KU-CLOSE';
const relations=[
  {from:'KU-OPEN-INSERT',to:'KU-SETUP',relation:'insert_transitions_to_exam_setup',evidence:ev(['SHOT-001','SHOT-002','CUE-001'],'模糊插入画面后转入试卷讲评')},
  {from:'KU-SETUP',to:'KU-Q01',relation:'setup_to',evidence:ev(['CUE-005','CUE-006'],'开场考试设定进入第一题')},
  {from:'KU-Q02',to:'KU-Q09',relation:'revisited_by',evidence:ev(['CUE-011','CUE-040','CUE-041'],'24小时到7天在选择与填空重复')},
  {from:'KU-Q04',to:'KU-Q11',relation:'revisited_by',evidence:ev(['CUE-023','CUE-043'],'六类需求重复')},
  {from:'KU-Q07',to:'KU-Q15',relation:'revisited_by_with_carrier_conflict',evidence:ev(['CUE-030','CUE-054','FRAME-CUE-030','FRAME-CUE-054'],'爆款三类型重复且首项转写冲突')},
  {from:'KU-VISUAL',to:'KU-Q20',relation:'visible_marks_accumulate_through',evidence:ev(['TARGET-0049','TARGET-0051'],'红色批注从开头至结尾积累')},
  {from:'KU-CLOSE',to:'KU-CLOSE-IDENTITY-BOUNDARY',relation:'spoken_self_label_coexists_with_distinct_visible_account_label',evidence:ev(['CUE-069','OCR-00190'],'口头“雷自强编导”与可见“人类最强编导”并存，不互相替代')},
  {from:'KU-CLOSE',to:'KU-SETUP',relation:'payoff_for',evidence:ev(['CUE-001','CUE-003','CUE-067','CUE-068'],'90分评价回扣考试设定')}
];
const reconstruction={
  schemaVersion:'video-reconstruction-1.0',evidencePack:'../evidence/evidence-pack.json',probe:'probe.json',protocol:'capture-protocol.json',
  scopeStatement:'仅重建本地MP4、提供SRT、evidence pack与本次targeted/OCR所含视频内部信息；作者平台、数据和效果主张未做外部验证。',
  viewerChange:probe.viewerChange,
  derivedSources:[
    {id:'SRC-TARGETED',path:'targeted-evidence/targeted-evidence.json',kind:'protocol-targeted frames',producedBy:'capture-protocol-evidence.mjs',timeRange:{start:0,end:218.082},limitations:['离散帧不能证明无隐藏剪辑','小号试卷文字仍可能不可读']},
    {id:'SRC-OCR',path:'targeted-evidence/ocr-evidence.json',kind:'macOS Vision OCR proposals',producedBy:'ocr-frames.swift plus visual frame review',timeRange:{start:0,end:218.082},limitations:['OCR多为0.5置信度','小字与手写识别不可靠','已接受的行仅用于账号标签等可目视复核文字']}
  ],
  transcript:{origin:pack.transcript.origin,cues:pack.transcript.cues.map(c=>({id:c.id,start:c.start,end:c.end,text:c.text,representativeFrame:c.representativeFrame,overlappingShots:c.overlappingShots}))},
  knowledgeUnits:units,relations,
  coverageMatrix:{
    channels:probe.informationCarriers.map(c=>({id:c.id,available:c.available,inspected:c.inspected})),
    meaningChanges:probe.meaningChanges.map(m=>({id:m.id,captured:true,unitIds:m.id==='MC-00'?['KU-OPEN-INSERT']:m.id==='MC-01'?['KU-SETUP']:m.id==='MC-02'?units.filter(u=>/^KU-Q0[1-8]$/.test(u.id)).map(u=>u.id):m.id==='MC-03'?['KU-TRANSITION']:m.id==='MC-04'?units.filter(u=>/^KU-Q(09|1[0-9]|20)$/.test(u.id)).map(u=>u.id):['KU-CLOSE','KU-CLOSE-IDENTITY-BOUNDARY']})),
    relationships:probe.relationshipHypotheses.map(r=>({id:r.id,evidenced:true,evidenceRefs:r.id==='REL-00'?['SHOT-001','SHOT-002','CUE-001']:r.id==='REL-01'?['CUE-005','CUE-006']:r.id==='REL-02'?['CUE-023','CUE-040']:r.id==='REL-03'?['TARGET-0007','TARGET-0024']:r.id==='REL-04'?['CUE-069','OCR-00190']:['CUE-001','CUE-068']})),
    criticalQuestions:probe.criticalQuestions.map(q=>({id:q.id,status:['CQ-05','CQ-07','CQ-09'].includes(q.id)?'unknown':'answered',unitIds:q.id==='CQ-01'?['KU-SETUP','KU-VISUAL','KU-LABEL']:q.id==='CQ-02'?units.filter(u=>/^KU-Q/.test(u.id)).map(u=>u.id):q.id==='CQ-03'?['KU-Q02','KU-Q04','KU-Q07','KU-Q09','KU-Q11','KU-Q15']:q.id==='CQ-04'?['KU-Q08']:q.id==='CQ-05'?['KU-Q07','KU-Q08','KU-Q15','KU-Q18']:q.id==='CQ-06'?['KU-Q02','KU-Q05','KU-Q06','KU-Q20']:q.id==='CQ-07'?['KU-VISUAL']:q.id==='CQ-08'?['KU-SETUP','KU-CLOSE']:['KU-ABSENCE'],evidenceRefs:q.id==='CQ-01'?['CUE-001','CUE-004','FRAME-CUE-001']:q.id==='CQ-02'?['CUE-006','CUE-066']:q.id==='CQ-03'?['CUE-023','CUE-040','CUE-054']:q.id==='CQ-04'?['CUE-032','CUE-037']:q.id==='CQ-05'?['CUE-030','FRAME-CUE-030','CUE-054','FRAME-CUE-054']:q.id==='CQ-06'?['CUE-011','CUE-065']:q.id==='CQ-07'?['TARGET-0049','TARGET-0050','TARGET-0051']:q.id==='CQ-08'?['CUE-001','CUE-068']:['SHOT-001','SHOT-002','SHOT-003']})),
    cueAccountability:pack.transcript.cues.map(c=>({cueId:c.id,disposition:'knowledge',unitIds:c.id==='CUE-001'?['KU-OPEN-INSERT','KU-SETUP']:[mapCue(Number(c.id.slice(4)))],rationale:c.id==='CUE-001'?'该cue横跨开头插入画面及转入考试设定，两端均显式链接；原文完整保留。':'该cue属于对应题目、转场或结尾知识单元，原文完整保留。'})),
    coreEvidence:{covered:units.filter(u=>u.importance==='core'&&u.evidence.length).length,total:units.filter(u=>u.importance==='core').length},
    unknowns:[...new Set(units.flatMap(u=>u.unknowns))],uncheckedChannels:[]
  },
  metaGate:{question:'原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',pass:true,uncheckedChannels:[],overlookedMeaningChanges:[],overlookedRelationships:[],rationale:'协议与修复后的重建覆盖0至1.133秒模糊插入画面及来源/权属未知、随后试卷转场、完整时间线的语音/SRT与烧录字幕冲突、试卷、红色批注、人物/面罩、布局/技术分段、水印、非语音音频边界，并把结尾口头“雷自强编导”与可见“人类最强编导”分层；第10题中间类型明确未知。'}
};
fs.writeFileSync(run+'reconstruction.json',JSON.stringify(reconstruction,null,2)+'\n');
const article=`# 《2026年普通高等自媒体全国统一考试》视频内容重建\n\n状态：结构化重建已完成；作者主张未做外部验证。\n\n这段约3分38秒的视频把自媒体方法论包装成一张20题“统一考试”。画面大部分时间是一张试卷，红色批注不断累积；右下角是一名戴红色蜘蛛侠式面罩的讲解者。可见账号标签为“人类最强编导”，结尾也以这一称谓署名，但真实身份、面罩角色授权以及书写是否无剪辑连续均未被视频证明。[00:00–03:38]\n\n## 选择题：作者认可与否定的八组判断\n\n1. 更新没有统一频率，但不能长期断更；作者否定大量所谓“养号/活跃”方法。[00:10–00:26]\n2. 作者称主要推流周期从24小时延长到约7天，因此选择“深度、有价值的内容”。平台、政策时间和数据来源未说明。[00:26–00:36]\n3. 只凭个人喜好而不考虑用户和平台，被作者判为错误；其替代方案是结合自身资源、用户需求与平台偏好。[00:36–00:55]\n4. 六类用户需求是审美、共鸣、成长、猎奇、情绪和解决问题；“养号活跃”不属于其中。[00:55–01:09]\n5. 作者概括平台偏好的Vlog为真实、反差、交互。[01:09–01:15]\n6. 作者所称百万爆款必要条件包括：用户能看懂且理解成本低并连接大群体、调动情绪、满足信息需求；被选作非必要项的D选项文字没有被SRT保留。[01:15–01:28]\n7. 三种爆款类型中的后两项为“惊世骇俗”“打破节奏型”；首项存在载体冲突：SRT写“万古同杯”，烧录字幕更像“万古同悲”，不能静默校正。[01:28–01:37]\n8. 作者排斥AI包办脚本/拍摄、替代创作者贡献或保证爆款，认可用AI补齐知识缺陷，并参与一种SRT写作“通道风暴”的活动。这个词疑似转写错误，但画面不足以可靠改成别的词。[01:37–01:55]\n\n## 填空题：重复、扩展与执行边界\n\n第9题再次填写“24小时延长到约7天”；第10题称导演扶持计划包括AI短片、纪录片和人间观察；第11题重复六类用户需求；第12题用“投流只负责锦上添花，不负责雪中送炭”界定投流。[01:59–02:27]\n\n第13题给出Vlog IP的四个观察维度，SRT记录为“刻板、行为作风、个人风格和IP立体度”，但首项及断句可能不准。第14题把Vlog分为日常型软素材（有啥拍啥）与挑战型硬素材（为了拍而去做某件事）。第15题重复三种爆款类型，首项此处又被SRT写成“灌骨铜杯”，与前文及烧录字幕继续冲突。[02:27–02:50]\n\n第16题要求从自身找选题：做过/能做且多数人做不到的事、特别大的优缺点、极度擅长的事。第17题追热点要判断“有没有”和“能不能”，并评估能否及时跟进与翻车代价，但两个问句的完整宾语没有建立。第18题的三项文本要求在SRT中是“能等、练字、网感”，准确文字和含义无法可靠确认。[02:50–03:13]\n\n第19题把赛道分为口播与非口播：前者列情感、成长、厚黑、干货；后者列Vlog、短片、AIGC、微综艺、颜值。第20题称爆款系列通常有3到6个月生命周期，疲软时应优化调整或考虑变现；数据来源与普适性未说明。[03:13–03:31]\n\n## 结尾如何回扣开场\n\n作者把这套题评价为“比较基础”，称90分以上可以准备拿到“自媒体的大结果”，随后署名告别。它在语义上兑现了开场的考试设定，但“大结果”的定义和保证程度没有说明。[03:31–03:38]\n\n## 视频没有建立什么\n\n在检查的完整时间线、字幕、试卷、批注、水印与结尾中，未观察到试卷获取CTA、明确的平台政策出处、价格、账号要求、地区条件或外部数据来源。这个结论只限于本视频，不代表这些信息在视频外不存在。音轨存在，但背景音乐/音效的具体语义、来源和权属也未能由现有证据可靠确定。\n`;
fs.writeFileSync(run+'article.md',article);
fs.writeFileSync(run+'article.md',article
  .replace('这段约3分38秒的视频把自媒体方法论包装成一张20题“统一考试”。画面大部分时间是一张试卷，红色批注不断累积；右下角是一名戴红色蜘蛛侠式面罩的讲解者。可见账号标签为“人类最强编导”，结尾也以这一称谓署名，但真实身份、面罩角色授权以及书写是否无剪辑连续均未被视频证明。','0至1.133秒先出现一段模糊插入画面，烧录字幕为“开头展示教程”；其来源、作者、授权和权属均未被视频建立。随后视频把自媒体方法论包装成一张20题“统一考试”。画面大部分时间是一张试卷，红色批注不断累积；右下角是一名戴红色蜘蛛侠式面罩的讲解者。可见账号标签为“人类最强编导”，但这不等同于真实身份、素材权属或面罩角色授权，也不能证明书写无剪辑连续。')
  .replace('第9题再次填写“24小时延长到约7天”；第10题称导演扶持计划包括AI短片、纪录片和人间观察；第11题重复六类用户需求；第12题用“投流只负责锦上添花，不负责雪中送炭”界定投流。','第9题再次填写“24小时延长到约7天”。第10题的印刷题面只可靠显示“AI短片、[空缺]和微纪录片”；SRT在空缺附近噪声较大，不能补全中间类型。第11题重复六类用户需求；第12题用“投流只负责锦上添花，不负责雪中送炭”界定投流。')
  .replace('作者把这套题评价为“比较基础”，称90分以上可以准备拿到“自媒体的大结果”，随后署名告别。它在语义上兑现了开场的考试设定，但“大结果”的定义和保证程度没有说明。','作者把这套题评价为“比较基础”，称90分以上可以准备拿到“自媒体的大结果”，随后口头说“我是雷自强编导”并告别。画面可见标签仍是“人类最强编导”；二者不可互换，视频也未证明法律身份、账号主体或文档归属。结尾在语义上兑现了考试设定，但“大结果”的定义和保证程度没有说明。'));
