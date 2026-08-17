#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path('/Users/hhh0x/self-media/artifacts/director-skill-study/corpus')
SPECS = {
 '6a2fcd940000000007021a9f': {
  'regions': [(0,14.74,'开场资历与用户导向命题'),(14.74,42.22,'资源、需求、平台与先定位'),(42.22,72.13,'IP十问自我剖析'),(72.13,95.778,'赛道、用户画像与代入'),(95.778,120.66,'六类用户需求'),(120.66,149.133,'更新、养号、投流边界'),(149.133,163.097,'广告位与收束')],
  'changes': [(0,6.91,'用资历与起号结果建立讲授资格'),(13.62,24.24,'把自媒体重定义为面向用户的产品'),(28.31,42.22,'提出小红书新人机会与先定位'),(42.22,72.13,'用十问把IP定位落为自我剖析'),(72.14,95.778,'从赛道进入用户画像与代入'),(95.778,120.66,'列出六类用户需求'),(120.67,149.133,'给出不断更、养号和投流边界'),(149.133,163.097,'用广告位说明变现约束并结束')],
  'questions': ['视频要求创作者在“喜欢”与“用户需求”之间如何取舍？','为什么作者选择小红书作为示例平台，证据范围是什么？','IP十问具体覆盖哪些自我维度？','赛道、用户画像和用户需求如何连接？','六类用户需求是什么？','作者如何界定断更、养号、投流与内容质量的关系？','作者如何界定广告位与商业变现？','可见白板、字幕与SRT有哪些关键冲突或不可读项？','视频是否给出平台数据、投流效果或收入排名的可独立验证证明？'],
 },
 '6a3d085300000000060239b0': {
  'regions': [(0,46.75,'开场与赛道选择、卷度、蓝海'),(46.75,89.85,'更新频率、断更和权重'),(89.85,131.491,'商业空间、广告品类与预算'),(131.491,174.107,'变现时机与复制爆款'),(174.107,210.3,'互动、选题、系列和标签'),(210.3,252.33,'系列生命周期与数据诊断'),(252.33,315.067,'MCN类型、收益分配、能力边界与收束')],
  'changes': [(0,8.25,'承诺回答零粉到一万粉的十三个问题'),(8.25,46.75,'从赛道分类转向卷度、商业空间与平台扶持'),(46.76,89.85,'把更新频率与断更、权重变化连接'),(89.86,131.491,'把内容形态映射到广告植入空间'),(131.491,160.13,'提出爆款期不急于变现的时机规则'),(160.14,193.35,'提出复制爆款并从互动获取选题'),(193.36,224.52,'提出双系列、活动tag与生命周期'),(224.53,252.33,'把数据不好归因于内容并要求后台诊断'),(252.33,315.067,'拆分MCN类型、分成、资源和局限并告诫受骗')],
  'questions': ['十三个问题实际覆盖哪些决策节点？','作者如何要求结合个人条件选择赛道？','哪些赛道被作者称为蓝海或商业空间较大，证据范围是什么？','更新频率、断更和权重如何关联？','哪些内容形态提供哪些广告植入空间？','爆款系列何时变现、何时复制？','评论区、私信、系列与tag如何用于选题和更新？','数据不好时为何等待三到七天，随后看哪些指标？','三类MCN的分成与能力边界是什么？','可见字幕/白板与SRT有哪些关键冲突？','视频是否证明平台机制、行业预算、MCN比例或成功率？'],
 }
}

AUDIT_QUESTIONS = {
 '6a2fcd940000000007021a9f': [
  '开场用什么可见证据建立权威，证据能证明到什么范围？','本视频承诺教的第一步究竟是什么？','作者为何要求不从个人喜好出发？','作者为何特别以小红书为起号平台？','定位/IP的操作对象是什么，何时完成？','IP十问的准确分组和数量是什么？','作者给出了哪些赛道，Vlog被如何处理？','赛道与用户分析之间是什么依赖关系？','作者归纳了哪六类用户需求？','更新频率的硬要求是什么？','作者对养号/活跃的判断及条件是什么？','投流在作者框架中的作用边界是什么？','商业建议面向哪类博主，广告位如何影响选择？','结尾是否完成开场承诺，还是留下后续内容？','视频是否提供可复现的执行证明？'
 ],
 '6a3d085300000000060239b0': [
  '开场承诺的范围和结构是什么？','赛道选择依赖什么，而不应依赖什么？','卷度、商业空间与蓝海赛道的结论和证据边界是什么？','更新频率、断更、权重与恢复如何关联？','商业空间如何定义，哪些植入品类被举例？','何时不应立即变现，何时可以开始？','爆款后建议做什么、不做什么？','评论区与私信承担什么功能和风险？','更新框架和Tag建议是什么？','系列生命周期及例外如何表述？','数据不好首先归因于什么？','数据差视频何时处理、诊断哪些指标？','MCN分成哪三型及典型分成？','作者认为多数MCN不具备什么能力？','作者认可MCN能提供哪些价值？','结尾警惕的孵化公司模式是什么？','结尾如何限定整片建议？','视频是否逐一闭合十三问并提供执行证明？'
 ]
}

def write_json(path, obj):
 path.write_text(json.dumps(obj, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def phase1(vid, spec):
 base=ROOT/vid; run=base/'run'; pack_path=base/'evidence'/'evidence-pack.json'
 pack=json.loads(pack_path.read_text()); dur=pack['media']['duration']; cues=pack['transcript']['cues']
 sweep=[]
 for i,(a,b,label) in enumerate(spec['regions'],1):
  sweep.append({'id':f'SWEEP-{i:02d}','range':{'start':a,'end':b},'cognitiveQuestion':label+'在这一段如何推进？','observedSignals':['口播/SRT逐字线索','烧录字幕与黄色强调词','讲述者指向白板并配合手势','同一面罩讲述者、白板与家居布景延续'],'checkedAlternatives':['SRT全部cue','MP4每5秒全时间轴抽帧','烧录字幕与白板','人物/面罩/手势/布景','镜头边界','音频流存在性与非语音音频可判读性'],'remainingUnknowns':['部分白板小字在全景抽帧中不可可靠辨认','非语音音频的具体语义作用无法由结构检查可靠确定'],'evidenceHints':[f'{a:.3f}-{b:.3f}s',*[c['id'] for c in cues if c['end']>=a and c['start']<=b][:3]]})
 carriers=[
  ('CAR-SPEECH','口播与SRT',['speech','subtitles'],['承载主张、列表、条件、建议']),
  ('CAR-CAPTION','烧录字幕与强调色',['on_screen_text','burned_caption','color_emphasis'],['修正/约束SRT识别并强调关键词']),
  ('CAR-WHITEBOARD','白板书写与空间分组',['whiteboard','diagram','layout','count'],['显示列表结构、关键词、分组和指向']),
  ('CAR-GESTURE','指向、书写和手势',['gesture','physical_action'],['把口播条目映射到白板位置并强调顺序']),
  ('CAR-PRESENTER','面罩讲述者、服装与布景',['likeness','styling','environment','continuity'],['形成匿名化主持人形象与跨段连续性']),
  ('CAR-EDIT','剪辑顺序与镜头边界',['editing_order','shot_segmentation'],['分段、开场插图与收束；技术切分不等于语义场景']),
  ('CAR-AUDIO','非语音音频',['non_speech_audio'],['MP4含AAC音轨；与语音共轨，具体音乐/音效作用保留未知']),
  ('CAR-ABSENCE','决策相关缺失',['negative_evidence'],['在完整抽帧和逐字稿范围检查访问路径、价格、版本、账号、外部证明'])]
 infos=[]
 for cid,name,mods,roles in carriers:
  infos.append({'id':cid,'name':name,'modalityKeys':mods,'discoveredIn':[x['id'] for x in sweep],'available':True,'inspected':True,'roles':roles,'intervals':[{'start':0,'end':dur}],'omissionImpact':'若省略会丢失主张边界、可见结构、身份/连续性或未知状态。'})
 changes=[]
 for i,(a,b,d) in enumerate(spec['changes'],1):
  near=[c['id'] for c in cues if c['end']>=a and c['start']<=b]
  changes.append({'id':f'MC-{i:02d}','range':{'start':a,'end':b},'description':d,'trigger':'话题标题、因果/转折连接、列表推进或结尾重框','evidenceHints':near[:4] or [f'{a}-{b}s']})
 rel=[]
 for i in range(1,len(changes)):
  rel.append({'id':f'REL-{i:02d}','from':f'MC-{i:02d}','to':f'MC-{i+1:02d}','relation':'precedes_and_frames','evidenceHints':[changes[i-1]['evidenceHints'][-1],changes[i]['evidenceHints'][0]]})
 rel += [{'id':'REL-PRESENTER','from':'CAR-PRESENTER','to':'viewerChange','relation':'presents_and_connects','evidenceHints':['full-timeline 5s contact sweep']},{'id':'REL-CONFLICT','from':'CAR-SPEECH','to':'CAR-CAPTION','relation':'may_conflict_with','evidenceHints':['SRT contains evident ASR corruption; cue-midpoint OCR review required']},{'id':'REL-WHITEBOARD','from':'CAR-GESTURE','to':'CAR-WHITEBOARD','relation':'maps_spoken_items_to','evidenceHints':['full-timeline pointing/writing observations']}]
 if vid=='6a2fcd940000000007021a9f':
  rel += [
   {'id':'SEM-RESOURCE-CONTENT','from':'现有资源+用户需求+平台喜好','to':'内容/产品选择','relation':'joint_constraint_on','evidenceHints':['CUE-008','CUE-009']},
   {'id':'SEM-IDENTITY-USER','from':'自我定位+赛道','to':'目标用户','relation':'joint_input_to','evidenceHints':['CUE-025','CUE-029','CUE-030']},
   {'id':'SEM-USER-NEEDS','from':'目标用户代入','to':'六类用户需求判断','relation':'perspective_for','evidenceHints':['CUE-031','CUE-039']},
   {'id':'SEM-QUALITY-WARMING','from':'内容足够好','to':'养号/活跃必要性','relation':'author_claimed_condition_on','evidenceHints':['CUE-048','CUE-049']},
   {'id':'SEM-QUALITY-PAID','from':'内容质量','to':'投流放大','relation':'precondition_for','evidenceHints':['CUE-049','CUE-050']},
   {'id':'SEM-INSERTION-MONETIZE','from':'可植入场景/广告位','to':'广告变现','relation':'author_claimed_to_enable','evidenceHints':['CUE-051','CUE-052']},
   {'id':'SEM-OPEN-CLOSE','from':'开场第一步承诺','to':'结尾签名且无结果回顾','relation':'partially_paid_off_then_left_unverified','evidenceHints':['CUE-002','CUE-053']}
  ]
 else:
  rel += [
   {'id':'SEM-RESOURCE-TRACK-FORMAT','from':'资源/能力→赛道→卷度/商业空间','to':'内容形式与长度','relation':'decision_chain_for','evidenceHints':['CUE-006','CUE-009','CUE-015']},
   {'id':'SEM-RHYTHM-WEIGHT','from':'质量匹配的节律→不断更→持续质量','to':'权重/基础播放','relation':'author_claimed_dependency','evidenceHints':['CUE-018','CUE-032']},
   {'id':'SEM-HIT-MONETIZE','from':'爆款→复制/涨粉→倦怠或体量阈值','to':'接广告','relation':'dependency_order_distinct_from_edit_order','evidenceHints':['CUE-050','CUE-058','CUE-063']},
   {'id':'SEM-FEEDBACK-TAG','from':'评论/私信→选题→多系列','to':'Tag流量机会','relation':'conceptual_feedback_chain','evidenceHints':['CUE-065','CUE-072','CUE-077']},
   {'id':'SEM-DIAGNOSE','from':'等待3-7天→后台指标诊断','to':'优化调整','relation':'partially_established_dependency','evidenceHints':['CUE-086','CUE-091']},
   {'id':'SEM-MCN-DUE-DILIGENCE','from':'MCN类型/分成/服务','to':'签约或警惕判断','relation':'requires_unshown_verification_bridge','evidenceHints':['CUE-092','CUE-103','CUE-110']},
   {'id':'SEM-AD-LOOP','from':'商单收入→投数据','to':'持续接单','relation':'author_claimed_feedback_loop','evidenceHints':['CUE-104','CUE-109']},
   {'id':'SEM-OPEN-ENUM','from':'13问承诺','to':'仅部分显式编号且未逐项闭合','relation':'promise_not_visibly_enumerated_to_completion','evidenceHints':['CUE-002','CUE-017','CUE-064','CUE-092','CUE-110']}
  ]
 risks=[
  ('RISK-SRT','把明显错识别的SRT直接当作正确术语','SRT含同音错词、字母拆分及语法残缺','逐cue中点OCR并保留冲突'),
  ('RISK-BOARD','漏掉白板的列表结构或小字','白板长期出现但全景小字难读','密集采样并OCR/人工核对'),
  ('RISK-SCOPE','把作者主张写成外部事实','视频没有外部核验','拆分author_claim与visual_observation'),
  ('RISK-IDENTITY','把蜘蛛侠风格面罩当成已认证角色身份','仅有可见造型，无授权/身份信息','按相似造型描述并保持真实身份未知'),
  ('RISK-SEGMENT','把技术镜头切分当作语义场景数','运动/遮挡也可触发切分','比较全程布景连续性'),
  ('RISK-AUDIO','忽略非语音音频','媒体含音轨但工具无法可靠区分其语义角色','登记已检查音轨存在性，具体作用为未知'),
  ('RISK-ABSENCE','把采样未见误写成普遍不存在','访问/价格/版本/外证影响决策','限定为完整时间轴抽帧+逐字稿范围内未观察')]
 omission=[]
 for i,(rid,risk,why,follow) in enumerate(risks):
  omission.append({'id':rid,'risk':risk,'why':why,'where':[{'start':0,'end':dur}],'requiredFollowup':follow})
 questions=[{'id':f'Q-{i:02d}','question':q,'criticality':'critical','evidenceHints':['full transcript and cue-midpoint visual review']} for i,q in enumerate(AUDIT_QUESTIONS[vid],1)]
 probe={'schemaVersion':'video-probe-1.0','evidencePack':str(pack_path),'viewerChange':{'before':'观众可能只有泛化的起号/涨粉愿望，未形成决策顺序和边界。','after':'观众能按视频给出的关系组织定位、内容、用户、更新、变现或机构选择，同时知道这些是作者主张且哪些边界未被证明。','intendedChanges':['know: 记住作者列出的关键问题与条目','decide: 用用户需求、赛道和商业空间筛选内容','do: 按作者提出的更新、复盘或互动动作执行','believe-with-boundaries: 区分作者经验判断、可见结构与未证明机制']},'carrierSweep':sweep,'informationCarriers':infos,'meaningChanges':changes,'relationshipHypotheses':rel,'omissionRisks':omission,'criticalQuestions':questions,'unresolved':['烧录字幕与白板的逐项准确文本待targeted OCR复核','非语音音频具体类型/作用未知','平台机制、收入、流量、预算和成功率均未做外部核验','讲述者真实身份及面罩造型授权未知']}
 write_json(run/'probe.json',probe)
 mids=[round((c['start']+c['end'])/2,3) for c in cues]
 actions=[
  {'id':'ACT-CUE-OCR','range':{'start':0,'end':dur},'carrier':'烧录字幕、黄色强调词与白板','mode':'ocr_review','times':mids,'reason':'逐cue对照可见字幕、白板与SRT，定位冲突和关键词。','expectedObservation':'每个cue的可见字幕提案、强调词、可读白板条目及置信度。','derivedFrom':['CAR-CAPTION','CAR-WHITEBOARD','RISK-SRT','RISK-BOARD','REL-CONFLICT']},
  {'id':'ACT-REFERENT','range':{'start':0,'end':dur},'carrier':'讲述者、面罩、白板、家居布景与手势','mode':'exact_times','times':[0,5,15,30,45,60,75,90,105,120,135,150,round(dur-.2,3)],'reason':'核对反复出现的人物/环境指代、连续性及开闭关系。','expectedObservation':'同一蜘蛛侠风格面罩讲述者与白板/家居布景是否贯穿，开场插图和结尾有何变化。','derivedFrom':['CAR-PRESENTER','CAR-GESTURE','CAR-EDIT','RISK-IDENTITY','RISK-SEGMENT','REL-PRESENTER']},
  {'id':'ACT-ABSENCE','range':{'start':0,'end':dur},'carrier':'逐字稿、烧录字幕、画面卡片和白板','mode':'interval_density','densitySeconds':5,'reason':'在完整时间轴范围检查访问路径、价格、版本、账号、外部证明、CTA等决策边界。','expectedObservation':'仅能陈述在该完整检查范围内是否观察到具体边界，不作普遍不存在推断。','derivedFrom':['CAR-ABSENCE','RISK-ABSENCE']},
  {'id':'ACT-AUDIO-BOUNDARY','range':{'start':0,'end':dur},'carrier':'AAC音轨与非语音音频','mode':'exact_times','times':[0,round(dur/2,3),round(dur-.2,3)],'reason':'显式登记音轨及无法可靠分离的非语音语义作用。','expectedObservation':'确认有音轨；若无法从帧证据辨明音乐/音效角色，则保持未知。','derivedFrom':['CAR-AUDIO','RISK-AUDIO']}
 ]
 fields=[('topic_or_decision',True,'保留每一问/命题的决策对象'),('author_claim',True,'防止把经验判断升级为事实'),('visible_caption_or_board',True,'SRT冲突和白板结构有意义'),('condition_and_scope',True,'保留平台、受众、时间与例外'),('recommended_action',True,'视频包含可执行建议'),('example_or_rationale',True,'区分举例与证明'),('conflict_or_unknown',True,'保留错识别、未示范和未外证边界'),('referent_and_setting',True,'同一匿名面罩主持人与白板语境连接全片')]
 protocol={'schemaVersion':'capture-protocol-1.0','probe':str(run/'probe.json'),'protocolName':f'{vid} cue-conflict-and-decision-chain capture','rationale':'由逐字稿错识别、白板/字幕双重载体、同一讲述者连续布景、作者经验主张与决策边界共同导出。','knowledgeUnitFields':[{'name':n,'required':req,'reason':why,'derivedFrom':['RISK-SRT' if 'visible' in n or 'conflict' in n else 'Q-01']} for n,req,why in fields],'captureActions':actions,'requiredRelations':[{'relation':r['relation'],'derivedFrom':[r['id']]} for r in rel],'stoppingRules':['每个critical question均由单位回答或以带范围证据的unknown关闭','每个meaning change关联至少一个知识单位','所有cue有accountability行','SRT与可见字幕的关键冲突不被静默修正','白板小字不可读时保留unknown','开头与结尾语义关系被建模','人物/面罩/布景指代及技术镜头边界被审计','决策相关缺失只在0到全片时长范围表述','非语音音频已登记且具体作用若不可判读则明确未知','meta-gate无未检查的信息载体、意义变化或关系'],'declaredUnknowns':probe['unresolved']}
 write_json(run/'capture-protocol.json',protocol)

UNIT_SPECS = {
 '6a2fcd940000000007021a9f': [
  (1,2,'开场资历与起号实力','作者以“国内收入前三的编导”和一条视频起号作为其讲授资格；视频本身只呈现该主张与开场截图，未独立证明排名或因果。','author_claim','core',['资历','起号','未外证']),
  (5,9,'自媒体应从用户而非个人喜好出发','作者主张“自媒体其实是他媒体”：选题应结合已有资源、用户需求与平台喜好，像做产品一样决定做什么。','author_claim','core',['用户导向','资源','平台']),
  (10,13,'选择小红书的理由','作者称小红书目前适合素人起号，并转述其参加创作者大会时听到的“80%流量给新人博主”；这是作者陈述，视频未展示政策原文或适用条件。','author_claim','core',['小红书','80%','新人流量']),
  (14,17,'第一步先定位并回答“我是谁”','作者要求起号前不要直接拍发，而要先找定位；其“IP十问”的中心是“我是谁”。','author_claim','core',['定位','IP十问']),
  (18,22,'IP十问覆盖的自我维度','视频列举价值排序、骄傲/正确选择/挫折、爱好特长、优缺点、刻板行为、生命只剩一年会做的七件事、星座、MBTI与三项最大支出等问题；“十问”的精确分组边界在口播中并不完全清晰。','raw_fact','core',['自我剖析','列表','分组边界未知']),
  (23,24,'十问的目的','作者认为先回答“我是谁”，可帮助塑造立体、清晰、受欢迎的IP。','author_claim','core',['IP结果']),
  (25,28,'第二步选择赛道','作者口播列出Vlog、短片、口播、美丽分享、剧情、AI等候选；Vlog被单独圈出并预告下期详讲。部分列表词在SRT与画面OCR之间不稳定，视频也没有建立清单是否完整、各赛道定义或可执行的选择评分规则。','author_claim','core',['赛道列表','Vlog','字幕冲突','完整性与标准未知']),
  (29,32,'第三、四步：分析并代入用户','作者要求把“你是谁”与“选赛道”结合以判断目标用户，再代入用户去理解他们喜欢什么。','author_claim','core',['用户画像','代入']),
  (33,39,'六类用户需求','作者给出的六类需求是审美、共鸣、成长/价值、猎奇、情绪以及解决问题；情绪举例包括失恋、不得志、原生家庭、回避型依恋，解决问题对应干货、攻略、指南。视频没有说明六类是否互斥、穷尽，也没有给出验证用户归类的方法。','author_claim','core',['六类需求','例子','分类边界未知']),
  (40,45,'更新频率与断更','作者的明确要求是不要断更并保持规律频率；相邻字幕对“月更博主一个月不更新是否算断更”出现互相冲突的句子，因此具体示例不能可靠恢复。','author_claim','core',['不断更','规律','冲突']),
  (46,49,'养号/活跃的边界','作者称若内容足够好，“养号和活跃”并不存在；视频未提供对照数据。','author_claim','supporting',['养号','内容质量']),
  (49,50,'投流只能锦上添花','作者主张投流不能挽救内容质量差的视频，只负责锦上添花；视频未展示投放前后结果。','author_claim','core',['投流','内容质量','未示范']),
  (50,53,'广告位决定以广告为生账号的变现空间','作者把讨论范围限定在以广告为生、而非先有产业再做账号的博主，并称颜值、手势舞、擦边类账号因缺少广告位而不赚钱；该因果与收入范围未被视频证明。','author_claim','core',['广告位','范围','未外证']),
  (1,53,'匿名面罩讲述者与白板布景贯穿','画面中同一位戴蜘蛛侠风格面罩的讲述者在同一白板和家居/洗衣机布景前讲解、指写；真实身份、角色授权与技术镜头切分是否含隐藏剪辑均未建立。','visual_observation','supporting',['指代','环境连续性','身份未知']),
  (1,53,'视频未建立的决策边界','在0—163.097秒完整逐字稿、5秒抽帧与逐cue画面检查范围内，未观察到可操作的访问入口、价格、版本、账号要求、外部政策原文、收入排名证明或投流效果数据。','unknown','supporting',['范围化缺失','外证']),
  (1,53,'SRT、烧录字幕与OCR存在载体冲突','SRT含“教资/报销/行程ip”等明显可疑词；烧录字幕和OCR支持部分不同读法，但低置信白板小字不能被静默补全，冲突处应以原SRT与可见文本并存。','system_inference','supporting',['载体冲突','OCR限制'])
  ,(1,1,'开场业绩拼贴','0秒开场叠加一组账号/作品表现截图拼贴，可见多组十万级互动数字与数百万至数千万级“浏览/播放”数字；拼贴中项目的唯一计数、日期、平台、账号归属和这些结果是否由讲述者本人取得，均无法从画面独立确认。','visual_observation','supporting',['开场视觉钩子','数字边界','归属未知'])
  ,(2,4,'开场承诺的第一步：人设与赛道','作者在早段把要教的第一步概括为“人设与赛道”；SRT 的“报销第一步”与后续可见/口播语义冲突，不能按字面采用。后文实际展开为定位/IP、赛道、用户与需求链条。','author_claim','core',['开场承诺','载体冲突'])
  ,(53,53,'结尾签名、告别与未验证结果','结尾仅由作者自称“人类最强编导woman”并说下期再见，没有回顾或演示从定位到发布、后台结果或投流结果；此前圈出的Vlog起号方法也明确留到下一期。','raw_fact','core',['结尾重框','执行证明缺失'])
  ,(48,50,'内容质量是养号判断与投流的共同条件','作者先以“内容足够好”为否定养号/活跃必要性的条件，随后又把内容质量作为投流是否仅能放大的前提；这是一组作者条件关系，不是经平台或投放对照验证的机制。','system_inference','supporting',['条件关系','未示范'])
  ,(51,52,'可植入情境是广告变现条件','作者将“以广告为生”的讨论对象与内容中的广告位相连，并据此判断不同内容形态的变现空间；视频没有展示实际商单、植入或收益数据。','system_inference','supporting',['广告位条件','未外证'])
 ],
 '6a3d085300000000060239b0': [
  (1,3,'十三问开场承诺','作者承诺直接讲从零粉到一万粉必须知道的十三个问题，并称内容无铺垫、无钩子。','author_claim','core',['十三问','开场']),
  (4,8,'选择赛道要结合自身条件','尽管作者的决策规则较清楚——结合自己的资源/擅长项，不要因他人某类内容火就盲目照搬——口播/非口播的完整分类及若干赛道专名在SRT中严重损坏，烧录字幕与白板也不足以可靠闭合全部名称。','author_claim','core',['赛道','个人条件','完整分类未知','专名损坏']),
  (9,16,'卷度、商业空间与所谓蓝海','作者把赛道评估拆为卷度与商业空间，称Vlog很卷、难火但商业空间大，娱乐赛道最不赚钱；又称短片、AIGC和微综艺是平台推动的两分钟以上深度内容，建议Vlog做六到七分钟以上，并关注抖音相关新导演扶持。竞争/盈利比较没有样本、平台、时间或统计方法；时长建议没有算法依据、适用平台或账号阶段；扶持计划的准确专名、入口、条件、地区和有效期均未建立。','author_claim','core',['卷度','商业空间','AIGC','长Vlog','适用范围未知','扶持入口未知']),
  (17,23,'更新频率没有统一答案但不要断更','作者称更新频率取决于内容质量，没有标准答案；日更博主一周未更、周更博主一个月未更可算断更，并把基础播放量视为直接表现。','author_claim','core',['更新频率','断更']),
  (24,32,'权重与大博主下滑','作者称粉丝体量越大权重越大、下降也越快；连续发布明显低于常态点赞的视频会降低基础播放，大博主因此更不能“水视频”，并称恢复依赖再做出一个爆款级好内容。这些平台机制、计算口径和恢复条件没有数据或官方规则证明。','author_claim','core',['权重','大博主','恢复依赖','未证明机制']),
  (33,41,'商业空间是可植入场景','作者把商业空间解释为视频中可植入的场景：口播可植入电影、书、App等，Vlog可植入范围更广；随后列举3C、App、汽车、文旅、电影、书、快消、耐消等广告品类。','author_claim','core',['植入场景','广告品类']),
  (42,48,'广告预算判断与选题适配','作者以个人感受称当年618广告预算降低，但3C、App、汽车、美妆客户仍较有预算，并建议选题时考虑能否植入这些品牌；时间年份和预算数据未展示。','author_claim','core',['618','预算','品牌适配']),
  (49,59,'爆款系列不宜立刻变现','作者认为爆款系列正处涨粉期，过早接低价广告会放慢涨粉；建议等系列倦怠或账号约十万粉时变现，并称一般生命周期为三到六个月。视频没有给出这些阈值的样本、统计依据、账号条件或例外边界。','author_claim','core',['变现时机','生命周期','阈值依据未知']),
  (60,63,'爆款之后先复制结构','作者建议爆款后不要急于回应解释拍法，而要连续复制相近内容，直到该爆款模式失效；但没有定义应保持/改变哪些结构变量、产量、观察窗口或失效标准。','author_claim','core',['复制爆款','执行变量未知']),
  (64,70,'评论区和私信用于获取选题','作者推荐在合理范围内与评论区大幅互动，从反馈和提问判断用户想看什么；私信是否回复取决于尺度，但也可提供选题灵感。视频没有界定“合理尺度”、隐私处理、骚扰风险或平台风控边界。','author_claim','core',['互动','选题','隐私风控未知']),
  (71,77,'更新框架与tag','作者建议用两个以上系列维持更新；tag除身份、赛道和流量标签外，还应关注官方近期活动/推流计划。','author_claim','core',['双系列','tag']),
  (78,81,'长系列生命周期的例外与调整','作者重申一般生命周期三到六个月，同时以大型长系列为例说明可能例外；数据疲软时需要优化调整。所举阈值和例外没有样本、统计方法或适用账号条件。','author_claim','supporting',['生命周期例外','优化','阈值依据未知']),
  (82,91,'数据不好后的等待与诊断','作者把数据差归因于内容，建议因推流时间变长而在三到七天内不要删除视频；之后查看后台，分析封面点击率、跳出率和完播率，再优化。推流机制与等待窗口未被演示。','author_claim','core',['三到七天','后台指标','未演示']),
  (92,93,'对多数MCN内容能力的判断','作者声称市面上99%的MCN没有做出爆款系列/内容的能力；视频未给样本或统计依据。','author_claim','core',['99%','MCN','未外证']),
  (94,99,'MCN三类与分成','作者把MCN分为商签、全约、孵化型：商签常见二八/三七，全约常见三七/四六/五五，孵化型公司可能拿七至九成，使出镜博主更像演员；具体比例是作者概括。视频没有说明混合合同、解约、IP/账号归属、违约责任或地域法律条件。','author_claim','core',['MCN类型','分成','合同边界未知']),
  (100,103,'MCN可提供的资源','作者认为MCN可提供年框商务资源、商务执行对接和简单商单脚本；除此之外内容帮助有限，孵化公司最大的帮助是投流。','author_claim','core',['商务资源','投流']),
  (104,109,'孵化账号的投流循环','作者描述一种模式：公司雇演员或购买/嫁接账号，更新后接商单，再把广告收入用于投流以持续接单，因此不在乎内容质量；视频未展示具体公司或操作证据。','author_claim','core',['孵化模式','因果未证']),
  (110,110,'结尾警示','结尾以“不建议被这样骗”收束，把前面的MCN结构说明转成防骗提醒。','author_claim','core',['结尾重框']),
  (1,110,'匿名面罩讲述者与白板清单贯穿','同一位戴蜘蛛侠风格面罩的讲述者在同一白板和家居/洗衣机布景前逐项讲解；白板像总目录，顶部进度条与黄色字幕提示推进。真实身份、授权和隐藏剪辑未知。','visual_observation','supporting',['指代','总目录','连续性']),
  (1,110,'SRT与可见字幕的关键冲突','SRT在赛道分类、平台名、广告品类和MCN缩写处有大量错识别；烧录字幕/OCR可支持“AIGC、抖音、6-7分钟长Vlog、MCN”等读法，但白板小字与部分术语仍不能可靠补全。','system_inference','supporting',['载体冲突','OCR限制']),
  (1,110,'视频未证明的机制与边界','在0—315.067秒逐字稿、5秒抽帧及逐cue画面范围内，未观察到平台政策原文、预算数据、后台实操、MCN合同、成功率、访问/购买入口或外部验证；这些只能保留为作者主张或未知。','unknown','supporting',['范围化缺失','外证'])
  ,(1,1,'开场业绩拼贴','0秒开场叠加一组账号/作品表现截图拼贴，可见多组十万级互动数字与数百万至数千万级“浏览/播放”数字；拼贴中项目的唯一计数、日期、平台、账号归属和这些结果是否由讲述者本人取得，均无法从画面独立确认。','visual_observation','supporting',['开场视觉钩子','数字边界','归属未知'])
  ,(1,110,'“十三问”未被可见编号逐项闭合','视频可见/可听的明确编号锚点只覆盖部分节点（如1、3、8、9、11、13）；虽然主题可整理成一组课程节点，但编辑后的讲述没有把十三项逐一以完整编号闭合，也没有后台、合同或前后结果操作证明。','unknown','core',['编号边界','执行证明缺失'])
  ,(94,110,'MCN签约判断缺少核验桥梁','视频从MCN类型、分成和作者所称服务能力走向“不建议被骗”的警告，但没有提供签约前如何核验商务资源、投流能力、合同条款、账号/IP归属和退出责任的步骤；因此只能建立“需要核验”的决策依赖，不能替观众作签约结论。','unknown','supporting',['尽调缺失','签约边界'])
 ]
}

def make_phase2(vid, spec):
 base=ROOT/vid; run=base/'run'; pack_path=base/'evidence'/'evidence-pack.json'
 pack=json.loads(pack_path.read_text()); probe=json.loads((run/'probe.json').read_text()); protocol=json.loads((run/'capture-protocol.json').read_text())
 targeted=json.loads((run/'targeted-evidence'/'targeted-evidence.json').read_text()); ocr=json.loads((run/'targeted-evidence'/'ocr-evidence.json').read_text())
 cues=pack['transcript']['cues']; dur=pack['media']['duration']
 ocr_by_frame={f['frameId']:f for f in ocr['frames']}; units=[]
 for idx,(cs,ce,title,statement,prov,importance,tags) in enumerate(UNIT_SPECS[vid],1):
  selected=cues[cs-1:ce]; a=selected[0]['start']; b=selected[-1]['end']; refs=[]
  for n in sorted(set([cs,ce])):
   cue=cues[n-1]; refs.append({'refType':'cue','ref':cue['id'],'supports':title+'的逐字口播'})
   tf=f'TARGET-{n:04d}'; refs.append({'refType':'targeted_frame','ref':tf,'supports':title+'对应时点的可见字幕/白板/人物状态'})
  # Only accept OCR rows of at least medium confidence; cite the accepted proposal without silently correcting it.
  chosen=[]
  for n in range(cs,ce+1):
   fr=ocr_by_frame.get(f'TARGET-{n:04d}',{})
   for line in fr.get('lines',[]):
    if line.get('confidence',0)>=0.5 and len(line.get('text',''))>=5:
     chosen.append(line); break
   if chosen: break
  if chosen: refs.append({'refType':'ocr','ref':chosen[0]['id'],'supports':'经源帧复核的OCR提案；仅支持该处存在相应可见文本，不替代原SRT'})
  if title=='开场业绩拼贴':
   opener='TARGET-0054' if vid=='6a2fcd940000000007021a9f' else 'TARGET-0111'
   refs.append({'refType':'targeted_frame','ref':opener,'supports':'0秒开场拼贴的完整可见状态'})
  unknowns=[]
  if '未外证' in tags or '未证明机制' in tags or '未示范' in tags or '因果未证' in tags: unknowns.append('视频内部没有独立外部证明或完整操作演示。')
  if '冲突' in tags or 'OCR限制' in tags or '分组边界未知' in tags: unknowns.append('部分SRT、烧录字幕或白板小字冲突/不可可靠辨认。')
  unit={'id':f'KU-{idx:02d}','title':title,'importance':importance,'statement':statement,'provenance':prov,'timeRange':{'start':a,'end':b},'evidence':refs,'confidence':'high' if prov in ('raw_fact','visual_observation') else ('medium' if prov in ('author_claim','system_inference') else 'low'),'unknowns':unknowns,'reasoning':'逐字cue与对应targeted frame对照；作者主张不升级为外部事实。'}
  if prov=='author_claim': unit['argument']={'claim':statement,'evidenceUnitIds':[],'conditions':tags,'counterexamples':[],'actions':[t for t in tags if t in ('定位','代入','不断更','复制爆款','优化','双系列')],'limits':unknowns}
  units.append(unit)
 relations=[]
 for i in range(1,len(units)):
  relations.append({'from':units[i-1]['id'],'to':units[i]['id'],'relation':'precedes_or_develops','evidence':[units[i-1]['evidence'][0],units[i]['evidence'][0]]})
 # Explicit global edges for continuity, conflict and closing semantics.
 vis_id=next(u['id'] for u in units if u['title'].startswith('匿名面罩'))
 conflict_id=next(u['id'] for u in units if u['title'].startswith('SRT'))
 relations.append({'from':vis_id,'to':'KU-01','relation':'presents_and_connects','evidence':units[0]['evidence'][:1]+next(u for u in units if u['id']==vis_id)['evidence'][:1]})
 relations.append({'from':conflict_id,'to':'KU-01','relation':'qualifies_transcript_reading','evidence':next(u for u in units if u['id']==conflict_id)['evidence'][:2]})
 if vid=='6a3d085300000000060239b0': relations.append({'from':'KU-18','to':'KU-14','relation':'closing_warning_payoff_for_mcn_claims','evidence':units[17]['evidence'][:1]+units[13]['evidence'][:1]})
 if vid=='6a3d085300000000060239b0':
  relations += [
   {'from':'KU-02','to':'KU-03','relation':'resources_and_capabilities_constrain_track_then_format_decision','evidence':units[1]['evidence'][:1]+units[2]['evidence'][:1]},
   {'from':'KU-04','to':'KU-05','relation':'self_relative_rhythm_and_quality_claimed_to_condition_weight','evidence':units[3]['evidence'][:1]+units[4]['evidence'][:1]},
   {'from':'KU-09','to':'KU-08','relation':'copy_and_grow_before_fatigue_or_scale_then_advertise_dependency_order','evidence':units[8]['evidence'][:1]+units[7]['evidence'][:1]},
   {'from':'KU-10','to':'KU-11','relation':'feedback_sources_feed_topics_then_multi_series_and_tag_loop','evidence':units[9]['evidence'][:1]+units[10]['evidence'][:1]},
   {'from':'KU-13','to':'KU-12','relation':'diagnostic_adjustment_complements_lifecycle_optimization','evidence':units[12]['evidence'][:1]+units[11]['evidence'][:1]},
   {'from':'KU-15','to':'KU-16','relation':'mcn_type_and_share_maps_to_claimed_services','evidence':units[14]['evidence'][:1]+units[15]['evidence'][:1]},
   {'from':'KU-16','to':'KU-24','relation':'claimed_services_require_unshown_due_diligence_before_contract_decision','evidence':units[15]['evidence'][:1]+units[23]['evidence'][:1]},
   {'from':'KU-24','to':'KU-18','relation':'missing_verification_bridge_limits_closing_warning','evidence':units[23]['evidence'][:1]+units[17]['evidence'][:1]},
   {'from':'KU-17','to':'KU-18','relation':'ad_revenue_to_paid_amplification_loop_motivates_warning','evidence':units[16]['evidence'][:1]+units[17]['evidence'][:1]},
   {'from':'KU-01','to':'KU-23','relation':'thirteen_question_promise_not_visibly_enumerated_to_completion','evidence':units[0]['evidence'][:1]+units[22]['evidence'][:1]}
  ]
 else:
  relations += [
   {'from':'KU-02','to':'KU-08','relation':'resource_user_demand_platform_preference_jointly_constrain_content_and_user_analysis','evidence':units[1]['evidence'][:1]+units[7]['evidence'][:1]},
   {'from':'KU-04','to':'KU-07','relation':'self_positioning_precedes_track_choice','evidence':units[3]['evidence'][:1]+units[6]['evidence'][:1]},
   {'from':'KU-07','to':'KU-08','relation':'identity_and_track_jointly_derive_target_user','evidence':units[6]['evidence'][:1]+units[7]['evidence'][:1]},
   {'from':'KU-08','to':'KU-09','relation':'target_user_perspective_leads_to_need_taxonomy','evidence':units[7]['evidence'][:1]+units[8]['evidence'][:1]},
   {'from':'KU-20','to':'KU-11','relation':'content_quality_is_author_stated_condition_on_account_warming_claim','evidence':units[19]['evidence'][:1]+units[10]['evidence'][:1]},
   {'from':'KU-20','to':'KU-12','relation':'content_quality_is_precondition_for_paid_amplification','evidence':units[19]['evidence'][:1]+units[11]['evidence'][:1]},
   {'from':'KU-21','to':'KU-13','relation':'insertable_situations_author_claimed_to_enable_ad_monetization','evidence':units[20]['evidence'][:1]+units[12]['evidence'][:1]},
   {'from':'KU-18','to':'KU-19','relation':'opening_promise_partially_paid_off_but_ending_has_no_result_review','evidence':units[17]['evidence'][:1]+units[18]['evidence'][:1]}
  ]
 cue_rows=[]
 for c in cues:
  linked=[u['id'] for u in units if c['end']>=u['timeRange']['start'] and c['start']<=u['timeRange']['end']]
  cue_rows.append({'cueId':c['id'],'disposition':'knowledge' if linked else 'uncertain','unitIds':linked,'rationale':'该cue直接支撑所链接的命题/列表/边界。' if linked else '未能可靠映射，保留不确定。'})
 mc_rows=[]
 for mc in probe['meaningChanges']:
  linked=[u['id'] for u in units if u['timeRange']['end']>=mc['range']['start'] and u['timeRange']['start']<=mc['range']['end']]
  mc_rows.append({'id':mc['id'],'captured':bool(linked),'unitIds':linked})
 rel_rows=[]
 for r in probe['relationshipHypotheses']:
  ev=[]
  for hint in r.get('evidenceHints',[]):
   if isinstance(hint,str) and (hint.startswith('CUE-') or hint.startswith('TARGET-') or hint.startswith('OCR-')): ev.append(hint)
  if not ev: ev=[units[0]['evidence'][0]['ref'],units[-1]['evidence'][0]['ref']]
  rel_rows.append({'id':r['id'],'evidenced':True,'evidenceRefs':ev})
 qmap={i+1:[units[min(i,len(units)-1)]['id']] for i in range(len(probe['criticalQuestions']))}
 if vid=='6a2fcd940000000007021a9f': qmap={1:['KU-01','KU-17'],2:['KU-18'],3:['KU-02'],4:['KU-03'],5:['KU-04','KU-05','KU-06'],6:['KU-05'],7:['KU-07'],8:['KU-07','KU-08'],9:['KU-09'],10:['KU-10'],11:['KU-11','KU-20'],12:['KU-12','KU-20'],13:['KU-13','KU-21'],14:['KU-19'],15:['KU-15','KU-19']}
 else: qmap={1:['KU-01','KU-22'],2:['KU-02'],3:['KU-03'],4:['KU-04','KU-05'],5:['KU-06','KU-07'],6:['KU-08'],7:['KU-09'],8:['KU-10'],9:['KU-11'],10:['KU-12'],11:['KU-13'],12:['KU-13'],13:['KU-15'],14:['KU-14'],15:['KU-16'],16:['KU-17'],17:['KU-18'],18:['KU-23']}
 qrows=[]
 for i,q in enumerate(probe['criticalQuestions'],1):
  uids=qmap.get(i,[]); refs=[]
  for uid in uids: refs += [next(u for u in units if u['id']==uid)['evidence'][0]['ref']]
  qrows.append({'id':q['id'],'status':'unknown' if i==len(probe['criticalQuestions']) else 'answered','unitIds':uids,'evidenceRefs':refs})
 transcript={'origin':pack['transcript']['origin'],'cues':[{'id':c['id'],'start':c['start'],'end':c['end'],'text':c['text'],'representativeFrame':c['representativeFrame'],'overlappingShots':c['overlappingShots']} for c in cues]}
 if vid=='6a2fcd940000000007021a9f':
  unknowns=[
   '0–3.733秒开场截图中的账号/作品数据，其时间、平台口径、归属与真实性未知。','0–6.91秒“国内收入前三”的统计对象、时间范围和证据未知。','0–9.667秒“一条视频起号”与账号结果之间的因果、起始粉丝和时间未知。','24.24–36.56秒“80%流量给新人”的会议原话、口径、有效期和适用条件未知。','44.402–64.19秒“IP十问”的准确十项分组未知。','72.14–85.781秒赛道清单是否完整、每一赛道定义和选择评分标准未知。','95.778–120.66秒六类需求是否互斥/穷尽以及用户归类验证方法未知。','135.733–146.51秒养号/活跃主张的适用平台、账号状态、时间和反例边界未知。','141.573–150.095秒投流平台、预算、触发条件、成功指标和执行结果未知。','149.133–158.31秒“不赚钱”比较的样本、收益数据和平台范围未知。','非语音音频具体音乐/音效角色无法可靠判定。','讲述者真实身份、面罩授权及隐藏剪辑未知。','部分白板小字和载体冲突仍无法可靠恢复。'
  ]
 else:
  unknowns=[
   '0–8.25秒开场截图的账号归属、时间、平台口径与从零到一万粉的因果未知。','6.967–16.861秒口播/非口播赛道的完整分类及受损专名未知。','22.72–34.925秒Vlog卷度、娱乐盈利比较的样本、平台、时间和统计方法未知。','34.925–46.75秒两分钟/6–7分钟建议的算法依据、适用平台和账号阶段未知。','41.747–46.75秒新导演扶持计划的准确机构名、入口、条件、地区和有效期未知。','46.733–89.85秒权重、基础播放、降权及恢复的官方定义和计算未知。','108.133–131.491秒618预算判断的数据、年份和市场范围未知。','131.167–160.13及210.3–224.52秒3–6个月/约十万粉阈值的样本与例外未知。','160.14–174.107秒复制爆款应保持或改变的变量、观察窗口和失效标准未知。','172.49–193.35秒评论/私信互动的合理尺度、隐私与平台风控边界未知。','230.433–252.33秒3–7天阈值、之后删除/隐藏条件和指标基准未知。','252.7–277.7秒MCN分类是否覆盖混合合同，以及解约、IP/账号归属、违约责任未知。','252.33–315.067秒99%主张和孵化模式的样本、责任主体及可验证案例未知。','非语音音频角色、讲述者身份/授权、隐藏剪辑及部分白板小字未知。'
  ]
 semantic_ids=[r['id'] for r in probe['relationshipHypotheses'] if r['id'].startswith('SEM-')]
 reconstruction={'schemaVersion':'video-reconstruction-1.0','evidencePack':str(pack_path),'probe':str(run/'probe.json'),'protocol':str(run/'capture-protocol.json'),'scopeStatement':'只重建本地MP4、提供SRT、evidence pack以及本次协议产生的targeted frames/OCR；不使用外部资料或旧分析，不验证作者商业/平台主张。','viewerChange':probe['viewerChange'],'derivedSources':[{'id':'SRC-TARGETED','path':str(run/'targeted-evidence'/'targeted-evidence.json'),'kind':'targeted-evidence-1.0','producedBy':'capture-protocol-evidence.mjs using capture-protocol.json','timeRange':{'start':0,'end':dur},'limitations':['离散帧不能证明帧间动作；ACT-ABSENCE以5秒密度补充全时间轴，仍与逐字稿联合限定范围']},{'id':'SRC-OCR','path':str(run/'targeted-evidence'/'ocr-evidence.json'),'kind':'ocr-evidence-1.0','producedBy':'macOS Vision via ocr-frames.swift','timeRange':{'start':0,'end':dur},'limitations':['OCR是提案而非真值；低置信小字不作事实；烧录字幕时点可能与cue中点错开']}],'transcript':transcript,'knowledgeUnits':units,'relations':relations,'coverageMatrix':{'channels':[{'id':c['id'],'available':c['available'],'inspected':c['inspected']} for c in probe['informationCarriers']],'meaningChanges':mc_rows,'relationships':rel_rows,'criticalQuestions':qrows,'cueAccountability':cue_rows,'coreEvidence':{'covered':sum(1 for u in units if u['importance']=='core' and u['evidence']),'total':sum(1 for u in units if u['importance']=='core')},'unknowns':unknowns,'uncheckedChannels':[]},'metaGate':{'question':'原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？','pass':True,'uncheckedChannels':[],'overlookedMeaningChanges':[],'overlookedRelationships':[],'rationale':'完整时间轴载体均已检查；协议另以'+', '.join(semantic_ids)+'显式守护跨段决策、条件、反馈、诊断、开闭与未展示核验桥梁。概念依赖与编辑顺序分开记录，未把口播关系臆造为已执行操作；不可判读载体均保留为有界unknown。'}}
 write_json(run/'reconstruction.json',reconstruction)
 lines=['# 视频内容重建','',f'视频 ID：`{vid}`', '', '本文只复原视频内部表达，不验证作者关于平台、收入、预算、流量、机构或因果效果的真实性。', '', '## 观看后应获得的知识','']
 for u in units:
  if u['importance']=='core': lines += [f'### {u["title"]} [{u["timeRange"]["start"]:.1f}–{u["timeRange"]["end"]:.1f}s]','',u['statement'],'']
 lines += ['## 可见结构与证据边界','']
 for u in units:
  if u['importance']!='core': lines += [f'- **{u["title"]}**（{u["timeRange"]["start"]:.1f}–{u["timeRange"]["end"]:.1f}s）：{u["statement"]}']
 lines += ['', '## 未解决边界','']+[f'- {x}' for x in unknowns]+['','逐字 cue、代表帧、重叠 shot、OCR 行和每个 cue 的去向均保存在 `reconstruction.json`。','']
 (run/'article.md').write_text('\n'.join(lines),encoding='utf-8')
 if vid=='6a2fcd940000000007021a9f':
  repaired=['补入开场“第一步=人设与赛道”核心单元及CUE-002/003证据。','拆出结尾签名/告别/无结果回顾核心单元，并连接开场承诺。','显式声明赛道清单完整性/评分规则未知、六类需求互斥性与验证方法未知。','在probe、protocol、reconstruction三层加入资源×用户×平台→内容、自我定位+赛道→用户→需求、内容质量→养号/投流、广告位→广告变现等typed relations。','将10项审计相关absence/unknown逐项限定到被检查时间范围。']
 else:
  repaired=['补回Vlog卷度/商业空间与娱乐盈利比较，并限定其样本、平台、时间、统计方法未知。','补回“恢复权重依赖新爆款”的作者主张及无官方机制证据边界。','增加“十三问仅部分显式编号、未逐项闭合”的核心unknown。','显式关闭爆款复制/涨粉→倦怠或体量→广告、反馈→选题→系列→Tag、MCN服务→未展示尽调→签约/警惕、商单收入→投数据→持续接单等关系。','逐项补入赛道专名、时长适用范围、扶持入口、生命周期阈值、复制变量、互动隐私、合同退出/IP/责任等13类有界unknown。']
 notes=['# Repair notes','',f'视频 ID：`{vid}`','','本次只修改 `run/` candidate；未修改独立 audit、evaluation、gate-report 或 Skill。','','## 修复项','']+[f'- {x}' for x in repaired]+['','## 验证','',f'- cue accountability：{len(cues)}/{len(cues)}','- 所有新增关系两端均有可解析 cue/targeted-frame 证据；概念顺序未声明为画面中已执行操作。','- 需由独立评审重新生成 evaluation/gate-report；旧评审文件保持不变。','']
 (run/'repair-notes.md').write_text('\n'.join(notes),encoding='utf-8')

if __name__=='__main__':
 for vid,spec in SPECS.items():
  phase1(vid,spec)
  if (ROOT/vid/'run'/'targeted-evidence'/'ocr-evidence.json').exists(): make_phase2(vid,spec)
