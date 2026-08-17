import fs from 'node:fs';
import path from 'node:path';

const root='/Users/hhh0x/self-media/artifacts/director-skill-study/corpus';
const configs={
  '6a4a1cab0000000021020230':{
    duration:174.986,
    before:'观众可能只把“爆款”理解为高播放，不知道起号时应以关注转化为目标，也不知道单条与系列如何降低关注决策成本。',
    after:'观众能够按“价值是否被看见、是否有延续感、是否降低判断成本”区分涨粉型单条与系列，并知道作者补充的长尾与搜索流量条件。',
    changes:['把核心指标从播放量改为粉丝增长量','识别原创/跟热点单条的涨粉条件','理解系列通过延续感降低判断成本','把长期分发与标题关键词纳入起号考虑'],
    regions:[
      [0,8.899,'开场用什么证据建立续集与结果承诺？',['账号/作品数据截图、讲者口播、烧录字幕、面罩讲者和白板环境'],['speech','provided subtitles','burned captions','inserted screenshots','gesture','whiteboard','non-speech audio'],['截图中的账号身份、数据口径及日期未由视频建立'],['CUE-001','CUE-002','SHOT-001','SHOT-002','SHOT-003']],
      [8.899,20.37,'起号的首要判断标准和单条视频的第一类来源是什么？',['作者把粉丝增长量置于核心并引出原创爆款'],['speech','subtitles','burned captions','whiteboard headings','gesture','non-speech audio'],['白板小字局部不可可靠辨读'],['CUE-003','CUE-006','DENSE-0005','DENSE-0008']],
      [20.37,38.876,'“本人值得关注”包含哪些价值？',['身份/成就、外表美、人格魅力、攻略性价值依次展开'],['speech','subtitles','burned captions','whiteboard list','presenter pointing','non-speech audio'],['面罩与讲者真实身份、授权关系未知'],['CUE-007','CUE-013','DENSE-0009','DENSE-0015']],
      [38.876,61.39,'什么攻略或能力展示会带来关注？',['单次搜索型攻略与具有延续感的食谱/教程对比；能力技能列举'],['speech','subtitles','burned captions','whiteboard branches','gesture','non-speech audio'],['SRT“识谱”与画面字幕“食谱”存在冲突'],['CUE-014','CUE-020','DENSE-0017','DENSE-0024']],
      [61.39,80.041,'跟热点单条何时有涨粉意义，单条总体有什么代价？',['80%无涨粉意义的作者断言；在人设可见时可转化；单条制造判断成本'],['speech','subtitles','burned captions','whiteboard','gesture','non-speech audio'],['80%无样本、口径或外部验证；SRT疑似将“蹭热点”误写为“一二点”'],['CUE-021','CUE-028','DENSE-0026','DENSE-0032']],
      [80.041,107.982,'系列如何降低判断成本，剧情系列如何制造追更？',['直接给价值；剧情需人物IP、世界观、宏大故事框架'],['speech','subtitles','burned captions','whiteboard diagram','gesture','non-speech audio'],['没有展示账号后台以证明因果'],['CUE-028','CUE-038','DENSE-0033','DENSE-0043']],
      [107.982,136.65,'提升系列与挑战探索系列如何表达延续感？',['用期数、时长、对象、系统/完整/全面、未完叙事或数字；列出多组例名并短暂插入账号截图'],['speech','subtitles','burned captions','inserted account screenshots','whiteboard list','layout/count','non-speech audio'],['若干例名的SRT连写/误识别；账号截图细字与身份未完全可读'],['CUE-039','CUE-046','DENSE-0044','DENSE-0055']],
      [136.65,152.43,'全段总结与作者自身结果案例如何连接？',['隐性或直接展示价值；插入两张账号/作品截图；声称浏览30万到60万、粉丝1万到3-4万'],['speech','subtitles','burned captions','inserted screenshots','visual count','non-speech audio'],['截图是否同一账号/同一视频、统计窗口和因果未知'],['CUE-047','CUE-052','DENSE-0056','DENSE-0061']],
      [152.43,174.986,'结尾如何补充长尾条件并回扣起号？',['优质可反复观看、抖音站内留存、善用小红书搜索、标题关键词；身份口号和告别'],['speech','subtitles','burned captions','whiteboard','gesture','non-speech audio'],['平台机制、搜索效果、数据真实性未外部验证；未给具体标题模板'],['CUE-053','CUE-059','DENSE-0062','DENSE-0071']]
    ],
    events:[
      ['MC-01',0,8.899,'开场截图把本期定位为“暴力起号第二期”并声称前期已获结果','账号/作品数据截图与续集口播'],
      ['MC-02',8.899,16.848,'评价目标从播放转为粉丝增长并分出爆款视频/爆款系列','“最关注的数据就是粉丝增长量”'],
      ['MC-03',16.848,61.39,'原创单条的价值来源展开，并将一次性攻略与可延续攻略区分','身份/美/人格/攻略/才华列表与反例'],
      ['MC-04',61.39,80.041,'跟热点爆款被限制为只有呈现人设才可能转粉','80%断言、转换条件、判断成本'],
      ['MC-05',80.041,107.982,'论证转向系列，以降低判断成本并讲剧情系列','“更暴力的方法”及人物IP/世界观/框架'],
      ['MC-06',107.982,136.65,'系列模板扩展为提升与挑战探索，并把数字/未完结叙事视作延续信号','多个句式与账号截图'],
      ['MC-07',136.65,152.43,'原则总结后插入作者案例，提供结果数字但不证明因果','价值总结、浏览/粉丝增长声称'],
      ['MC-08',152.43,174.986,'结尾补充长尾与搜索分发条件并回扣起号目标','可反复观看、站内留存、标题关键词']
    ],
    risks:[
      ['OR-01','把播放量等同于涨粉','视频反复区分爆与转粉','0-174.986','保留全局目标与各策略的转换条件'],
      ['OR-02','漏掉短暂账号截图及其数据/例名','截图只出现数秒且含小字','0-5.3;117-133;145-153','OCR并人工检查截图，未知身份不补全'],
      ['OR-03','把SRT误识别静默修正','“识谱/一二点/地球小宝”等与烧录字幕或语境可能冲突','48-52.5;68.8-71.5;122.5-124.2','并列保留原SRT、OCR候选和支持的解释'],
      ['OR-04','将作者数据案例当作因果证明','只展示编辑后的截图和口播，没有后台连续操作','145-152.5','区分author_claim与visual_observation，记录统计口径未知'],
      ['OR-05','把面罩造型识别为真实身份或授权角色','仅能观察到蜘蛛侠风格面罩与账号角标','0-174.986','建立讲者/面罩/账号角标的referent边界'],
      ['OR-06','忽略白板层级与并列/分支关系','口播与指向白板共同表达结构','8.9-170','密集抓取白板可读标题并核对层级'],
      ['OR-07','漏掉决策相关缺项','视频提出策略但未给价格、课程购买或具体CTA入口','0-174.986','检查全时间线与结尾，限定为“未观察到”'],
      ['OR-08','把29个技术shot当作29次语义换景','人物遮挡/动作也可能触发切分','0-174.986','比较镜头代表帧与全局固定环境，保留隐藏剪辑未知']
    ],
    questions:[
      ['CQ-01','视频把什么指标定义为起号最关注的数据？','critical',['CUE-003','CUE-004']],
      ['CQ-02','原创爆款中“人值得关注”的价值由哪些部分构成？','critical',['CUE-006','CUE-020']],
      ['CQ-03','为什么一次性攻略可能只收藏不关注，什么条件改变结果？','critical',['CUE-014','CUE-019']],
      ['CQ-04','跟热点爆款在什么条件下才被作者认为能转粉？','critical',['CUE-022','CUE-025']],
      ['CQ-05','爆款系列相对单条降低的是什么成本？','critical',['CUE-027','CUE-031']],
      ['CQ-06','三类系列分别怎样制造延续感？','critical',['CUE-032','CUE-046']],
      ['CQ-07','作者为策略提供了什么结果案例，证据没有建立什么？','critical',['CUE-050','CUE-052','DENSE-0059']],
      ['CQ-08','结尾补充了哪些长尾与搜索动作？','critical',['CUE-053','CUE-059']],
      ['CQ-09','烧录字幕与SRT有哪些重要冲突？','supporting',['CUE-018','CUE-024','CUE-043']],
      ['CQ-10','视频是否给出平台机制、成功率、价格/购买入口或可复现后台证明？','supporting',['full timeline','CUE-059']]
    ],
    actions:[
      ['A-01',0,8.899,'inserted screenshots and burned captions','ocr_review',[0.3,1.2,2.5,4.8,7.5],'读取开场账号/作品截图、数据、续集标题及可见身份边界',['MC-01','OR-02','CQ-07']],
      ['A-02',8.899,61.39,'whiteboard hierarchy, gestures, burned captions','ocr_review',[10,17.5,25,35,42.5,50,57.5,61],'核对原创单条的白板层级、一次性攻略反例及“食谱/识谱”冲突',['MC-02','MC-03','OR-03','OR-06','CQ-02','CQ-03']],
      ['A-03',61.39,80.041,'speech-caption-whiteboard conflict and argument scope','ocr_review',[62.5,66,69.5,72.5,77.5,80],'读取80%断言、蹭热点标签、人设条件和单条劣势',['MC-04','OR-03','CQ-04']],
      ['A-04',80.041,107.982,'whiteboard hierarchy and presenter pointing','ocr_review',[82.5,88,92.5,97.5,101,105,107.9],'读取判断成本、剧情系列、人物IP/世界观/框架及追更关系',['MC-05','OR-06','CQ-05','CQ-06']],
      ['A-05',107.982,136.65,'series templates, account screenshots, burned captions','ocr_review',[110,115,118.5,121.5,123.2,126.5,129,132.5,136.5],'核对提升/探索模板、例名、数字和短截图',['MC-06','OR-02','OR-03','CQ-06']],
      ['A-06',136.65,152.43,'summary and claimed result screenshots','ocr_review',[138,142.5,146,148.5,150.5,152.3],'读取总结、两组插入截图及30万→60万/1万→3-4万声称',['MC-07','OR-02','OR-04','CQ-07']],
      ['A-07',152.43,174.986,'closing speech, burned captions, whiteboard and absence scope','ocr_review',[154,157.5,160.5,165,168.5,171.5,174.8],'读取长尾/站内留存/搜索关键词与最终身份口号，检查CTA/价格/入口缺项',['MC-08','OR-07','CQ-08','CQ-10']],
      ['A-08',0,174.986,'technical shots versus semantic continuity','exact_times',[0,30,60,90,120,150,174.8],'比较固定白板环境、讲者造型与插入截图，避免把shot数等同剪辑数',['OR-05','OR-08']],
      ['A-09',0,174.986,'non-speech audio','exact_times',[5,45,90,135,170],'登记音轨并检查非语音成分；语义无法可靠识别则保留未知',['OR-01']]
    ]
  },
  '6a4f70470000000021020657':{
    duration:163.561,
    before:'观众可能把编导能力理解成写逐字脚本或机械拆爆款，不清楚真正需要的感知、画面、节奏、表达和知识储备。',
    after:'观众获得一套作者提出的能力地图与训练法：选题判断、脚本画面化、媒介素材积累，以及通过多刷、管理收藏、脑内拍电影和反向拓展信息环境来训练。',
    changes:['把编导能力拆为选题、脚本、积累与训练','把写脚本前置为脑中画面而非详尽文本','反对机械拆爆款，强调多刷和可调用素材库','把需求感知与共情训练连接到突破信息茧房'],
    regions:[
      [0,9.78,'开场向什么人承诺什么结果？',['短插入画面、贫穷/请不起编导的条件、四方面培养承诺、第一点选题'],['speech','provided subtitles','burned captions','inserted clip','gesture','whiteboard','non-speech audio'],['SRT首句“展示饺子”与烧录字幕/画面可能冲突；四方面与后文编号不完全整齐'],['CUE-001','CUE-003','SHOT-001']],
      [9.78,30.95,'选题能力由哪些判断构成？',['热点追踪、舆情判断、“有没有/能不能”、需求感知、共情'],['speech','subtitles','burned captions','whiteboard list','gesture','non-speech audio'],['胖猫事件只作例子，未给判断流程或事实核验'],['CUE-004','CUE-010','DENSE-0005','DENSE-0013']],
      [30.95,49.125,'为什么要版本更新，高敏感与编导适配如何关联？',['大博主沿用2021打法到2026导致数据下滑的论述；高敏感人群适合'],['speech','subtitles','burned captions','whiteboard','gesture','non-speech audio'],['因果与普遍性没有数据证明；“版本”没有平台级定义'],['CUE-011','CUE-017','DENSE-0014','DENSE-0020']],
      [49.125,70.65,'作者如何定义脚本与节奏？',['先有画面再写文本；反对过细脚本；BGM与快切/慢切'],['speech','subtitles','burned captions','whiteboard hierarchy','gesture','non-speech audio'],['“好的风景一定是在心中的”可能是SRT/烧录字幕冲突；未展示脚本文档或剪辑时间线'],['CUE-018','CUE-024','DENSE-0021','DENSE-0029']],
      [70.65,85.391,'语言表达标准是什么，为什么反对拆爆款？',['能懂、炼字、网感；把大量记笔记比作无效错题本'],['speech','subtitles','burned captions','whiteboard','gesture','non-speech audio'],['“炼字”SRT可能写作“练字”；反对范围是机械拆解还是全部拆解需保留原话边界'],['CUE-025','CUE-029','DENSE-0030','DENSE-0035']],
      [85.391,120.51,'日常积累要覆盖哪些媒介与知识？',['呈现形式、BGM、梗、话题、镜头摆放、常识杂识、肢体语言与画面张力'],['speech','subtitles','burned captions','whiteboard list','gesture','non-speech audio'],['白板小字部分被人遮挡；没有列尽所有形式'],['CUE-030','CUE-041','DENSE-0036','DENSE-0049']],
      [120.51,148,'如何训练多刷与素材调用？',['少拆多刷、求多不求精、点赞收藏作素材库、反复筛选/观看、3秒联想和5秒定位'],['speech','subtitles','burned captions','whiteboard','gesture/timing claims','non-speech audio'],['“三视反复筛选”可能为ASR错误；3秒/5秒是目标口号，未实测'],['CUE-042','CUE-049','DENSE-0050','DENSE-0060']],
      [148,163.561,'结尾怎样训练画面想象、需求感知与共情并回扣开场？',['脑中拍电影、站在他人视角、不要困于信息茧房、“反过来大数据”、告别'],['speech','subtitles','burned captions','whiteboard','gesture','non-speech audio'],['“反过来大数据”含义只由后句解释；未给具体平台操作'],['CUE-049','CUE-054','DENSE-0061','DENSE-0067']]
    ],
    events:[
      ['MC-01',0,9.78,'从请不起编导的问题转为四方面自训承诺并进入选题','开场条件与承诺'],
      ['MC-02',9.78,30.95,'选题从追热点扩展为舆情、可做性、需求和共情判断','多个判断维度'],
      ['MC-03',30.95,49.125,'用版本老化解释大博主数据下滑并提出高敏感适配','2021→2026对比'],
      ['MC-04',49.125,70.65,'脚本被定义为先有画面再写文本，并加入节奏控制','反详尽脚本与BGM/快慢切'],
      ['MC-05',70.65,85.391,'语言三标准后转为反对机械拆爆款','能懂/炼字/网感与错题本类比'],
      ['MC-06',85.391,120.51,'编导被重构为杂学，需要长期积累呈现、声音、镜头、肢体与杂识','媒介和知识清单'],
      ['MC-07',120.51,148,'能力地图转为可执行训练：多刷、收藏素材库、快速调用、脑内拍片','明确动作与3秒/5秒目标'],
      ['MC-08',148,163.561,'训练扩展到换位与主动打破信息茧房，并用身份口号结束','反向拓展推荐内容']
    ],
    risks:[
      ['OR-01','将“四方面”强行整理成严格四章','后文编号重复且实际包含多组能力/训练动作','0-163.561','保留实际论述结构与编号不整齐'],
      ['OR-02','静默修正SRT与烧录字幕冲突','“饺子/裁员?”、“风景/分镜?”、“练字/炼字”、“三视”等可能冲突','0-75;128-133','OCR并列记录原始文本和支持解释'],
      ['OR-03','把胖猫事件与版本老化当客观因果','视频仅是作者观点与例子','11-49','使用author_claim并记录未给数据'],
      ['OR-04','漏掉白板提供的层级和媒介清单','白板持续存在且讲者频繁指向','0-163.561','密集抓取白板并人工核验'],
      ['OR-05','把蜘蛛侠风格面罩升级为真实身份或授权','仅可观察造型','0-163.561','保留visual_observation与身份未知'],
      ['OR-06','把“少拆多刷”概括为禁止分析爆款','作者批评的是大量记笔记式假努力，边界需保留','75-126','保留类比、原话与行动建议'],
      ['OR-07','把3秒/5秒当验证过的绩效标准','没有计时演示或外部结果','136-142.5','标为作者要求/目标而非证明'],
      ['OR-08','漏掉未给出的操作细节与商业条件','未展示具体收藏管理、算法设置、课程/价格/CTA入口','120-163.561','全时间线和结尾做范围化absence检查'],
      ['OR-09','把18个shot当作18次语义换景','主体运动可能触发技术切分','0-163.561','比较全局固定环境与唯一开场插入画面']
    ],
    questions:[
      ['CQ-01','选题能力包含哪些判断维度？','critical',['CUE-004','CUE-010']],
      ['CQ-02','作者为什么强调版本更新，高敏感与编导有什么关系？','critical',['CUE-011','CUE-016']],
      ['CQ-03','脚本为什么要先有画面，作者反对怎样的脚本劳动？','critical',['CUE-018','CUE-023']],
      ['CQ-04','节奏与语言表达分别包含什么？','critical',['CUE-024','CUE-026']],
      ['CQ-05','为什么作者反对大量拆爆款笔记，主张什么替代？','critical',['CUE-027','CUE-030','CUE-042']],
      ['CQ-06','日常积累需要覆盖哪些素材、形式与知识？','critical',['CUE-031','CUE-040']],
      ['CQ-07','点赞收藏如何成为素材库，快速调用目标是什么？','critical',['CUE-043','CUE-048']],
      ['CQ-08','画面想象、需求感知和共情分别如何训练？','critical',['CUE-049','CUE-053']],
      ['CQ-09','SRT与烧录字幕有哪些重要冲突，哪些仍未知？','supporting',['CUE-001','CUE-020','CUE-026','CUE-044']],
      ['CQ-10','视频有没有实测训练效果、具体平台操作、商业入口或普遍因果证据？','supporting',['full timeline','CUE-054']]
    ],
    actions:[
      ['A-01',0,9.78,'opening inserted clip, burned captions and promise','ocr_review',[0.2,1.2,2.5,5,8,9.7],'读取开场插入画面、条件、四方面承诺与首句冲突',['MC-01','OR-02','CQ-09']],
      ['A-02',9.78,49.125,'whiteboard hierarchy, burned captions and argument examples','ocr_review',[10,13,17.5,21,25,29,32.5,37.5,42.5,47.5,49],'核对选题维度、胖猫例、2021/2026版本对比与高敏感结论',['MC-02','MC-03','OR-03','OR-04','CQ-01','CQ-02']],
      ['A-03',49.125,70.65,'script/visual imagination and rhythm hierarchy','ocr_review',[50,54,57.5,60,64,67.5,70.5],'读取先画面后文本、详尽脚本批评、疑似“分镜”冲突及BGM快慢切',['MC-04','OR-02','OR-04','CQ-03','CQ-04']],
      ['A-04',70.65,85.391,'language standards and anti-breakdown claim','ocr_review',[72,75,78.5,82.5,85.3],'读取能懂/炼字/网感、拆爆款与错题本类比',['MC-05','OR-02','OR-06','CQ-04','CQ-05']],
      ['A-05',85.391,120.51,'media forms, accumulated materials and knowledge list','ocr_review',[87,91,94,99,102.5,106,110,114,118,120.4],'核对杂学、呈现形式、BGM/梗/话题/镜头/肢体/杂识清单',['MC-06','OR-04','CQ-06']],
      ['A-06',120.51,148,'training actions and timing claims','ocr_review',[121,124,128,131,134.5,138,141,145,147.8],'读取少拆多刷、点赞收藏素材库、筛选/复看、3秒/5秒和脑内拍片',['MC-07','OR-02','OR-06','OR-07','CQ-05','CQ-07']],
      ['A-07',148,163.561,'closing actions, burned captions and absence scope','ocr_review',[149,152,155,157.5,160,163.4],'读取换位、信息茧房、反向大数据、推荐内容与最终口号；检查操作/CTA缺项',['MC-08','OR-08','CQ-08','CQ-10']],
      ['A-08',0,163.561,'technical shots versus semantic continuity and presenter referent','exact_times',[0,30,60,90,120,150,163.4],'比较固定白板环境、面罩造型与开场插入画面，避免shot语义化',['OR-05','OR-09']],
      ['A-09',0,163.561,'non-speech audio','exact_times',[5,45,90,135,160],'登记音轨并检查非语音角色，不能可靠判断则保留未知',['OR-01']]
    ]
  }
};

configs['6a4a1cab0000000021020230'].actions.push(
 ['A-10',120.867,147.3,'audited example cards and result-card boundary text','ocr_review',[122.6,127.867,130.633,146.367],'逐卡读取现在是吴克、何香蓓Betty、张根源Genyuan，以及结果卡06-15日期和5.7万心形计数',['OR-02','OR-04','CQ-07']]
);
configs['6a4a1cab0000000021020230'].questions.push(
 ['CQ-11','哪些小红书账号卡被明确展示，画面能证明和不能证明什么？','critical',['SHOT-018','SHOT-020','SHOT-021']],
 ['CQ-12','结果卡直接可见哪些日期、播放与心形计数？','critical',['SHOT-024']],
 ['CQ-13','视频是否证明该作品造成了声称的粉丝增长？','critical',['CUE-050','CUE-052','SHOT-024']],
 ['CQ-14','广义规则的类别定义、跨平台范围、反例和因果证据是否建立？','critical',['full timeline','CUE-022','CUE-056','CUE-058']]
);
configs['6a4f70470000000021020657'].actions.push(
 ['A-10',0,163.561,'opening social proof and closing identity-label conflict','ocr_review',[0.2,1.0,2.0,160.3,161.5,163.0],'读取开场指标拼贴、持续水印与结尾自称/烧录字幕，保留归属和名称冲突',['OR-02','OR-05','CQ-09','CQ-10']]
);
configs['6a4f70470000000021020657'].questions.push(
 ['CQ-11','开场社会证明直接显示什么，其归属、时间和能力关联是否建立？','critical',['SHOT-001','SHOT-002','CUE-001']],
 ['CQ-12','持续水印、结尾字幕与自称之间是否存在名称冲突？','critical',['SHOT-018','CUE-054']],
 ['CQ-13','跳过详细脚本、反向训练推荐与评估训练效果各依赖哪些未展示条件？','critical',['CUE-021','CUE-052','CUE-053']],
 ['CQ-14','何时需要详细脚本、何为有效浏览，这些例外边界是否建立？','critical',['CUE-021','CUE-028','CUE-042']]
);

function rangeList(s){return s.split(';').map(x=>{const [a,b]=x.split('-').map(Number);return {start:a,end:b}})}
for(const [id,c] of Object.entries(configs)){
 const run=path.join(root,id,'run'); fs.mkdirSync(run,{recursive:true});
 const ep=path.join(root,id,'evidence/evidence-pack.json');
 const sweep=c.regions.map((x,i)=>({id:`SW-${String(i+1).padStart(2,'0')}`,range:{start:x[0],end:x[1]},cognitiveQuestion:x[2],observedSignals:x[3],checkedAlternatives:x[4],remainingUnknowns:x[5],evidenceHints:x[6]}));
 const allSweeps=sweep.map(x=>x.id);
 const carriers=[
  ['IC-01','口播与提供字幕',['speech','provided_subtitles'],['提出论点、条件、例子与行动建议']],
  ['IC-02','烧录字幕与画面文字',['burned_captions','on_screen_text','ocr'],['复现口播、暴露ASR冲突、短卡与数字']],
  ['IC-03','白板结构',['whiteboard','diagram','spatial_layout'],['显示并列、层级、关键词与讲者指向对象']],
  ['IC-04','插入截图/片段',['inserted_clip','account_screenshot','example'],['提供开场钩子、例证或结果声称的视觉语境']],
  ['IC-05','讲者造型、手势与环境',['presenter','gesture','likeness','environment'],['维持讲者/白板关系、强调项目、构成连续性与视觉身份']],
  ['IC-06','编辑顺序与技术shot',['editing_order','scene_detection','continuity'],['组织钩子、主讲、例证和结尾；技术边界仅作观察辅助']],
  ['IC-07','非语音音频',['non_speech_audio'],['媒体有AAC音轨；语音之外的具体成分与叙事作用未能可靠识别']],
  ['IC-08','范围化缺席证据',['negative_evidence','absence'],['检查决策相关入口、价格、实测或证明是否在完整时间线出现']]
 ].map((x,i)=>({id:x[0],name:x[1],modalityKeys:x[2],discoveredIn:allSweeps,available:true,inspected:true,roles:x[3],intervals:[{start:0,end:c.duration}],omissionImpact:['会丢失作者的显式主张与措辞','会丢失文字冲突、数字和短时信息','会丢失全局结构及手势所指','会把例证、账号状态或钩子从语境中删除','会误判人物身份、强调关系与环境连续性','会把技术切分误当语义场景或丢掉开闭场关系','会静默漏掉可用音频通道','会把未观察到的边界误补为事实'][i]}));
 const rels=c.events.slice(1).map((e,i)=>({id:`RH-${String(i+1).padStart(2,'0')}`,from:c.events[i][0],to:e[0],relation:i===c.events.length-2?'reframed_by':'precedes_and_frames',evidenceHints:[c.events[i][4],e[4]].filter(Boolean)}));
 rels.push({id:'RH-OPEN-CLOSE',from:'MC-01',to:`MC-${String(c.events.length).padStart(2,'0')}`,relation:'opening_promise_paid_off_or_narrowed_by_closing',evidenceHints:['opening cue group','final cue group']});
 const probe={schemaVersion:'video-probe-1.0',evidencePack:ep,viewerChange:{before:c.before,after:c.after,intendedChanges:c.changes},carrierSweep:sweep,informationCarriers:carriers,meaningChanges:c.events.map(e=>({id:e[0],range:{start:e[1],end:e[2]},description:e[3],trigger:e[4],evidenceHints:[e[4],`CUE interval ${e[1]}-${e[2]}`]})),relationshipHypotheses:rels,omissionRisks:c.risks.map(r=>({id:r[0],risk:r[1],why:r[2],where:rangeList(r[3]),requiredFollowup:r[4]})),criticalQuestions:c.questions.map(q=>({id:q[0],question:q[1],criticality:q[2],evidenceHints:q[3]})),unresolved:[...new Set(c.regions.flatMap(r=>r[5]))]};
 fs.writeFileSync(path.join(run,'probe.json'),JSON.stringify(probe,null,2));
 const fields=['provenance_class','bounded_time_range','evidence_references','claim_or_observation','conditions_and_limits','visual_identity_and_referent','carrier_conflict','global_role','unknowns'].map((name,i)=>({name,required:true,reason:['防止把作者主张升级为事实','确保每个知识单元可定位','连接字幕、帧、OCR和shot','保留论证原貌','限制普遍性和因果范围','防止面罩、账号或软件身份过度推断','保留SRT/烧录文字冲突','保留开场—主体—结尾及并列/依赖关系','阻止填补视频未建立的信息'][i],derivedFrom:[i===5?'OR-05':i===6?'OR-02':i===7?'RH-OPEN-CLOSE':i===8?'CQ-10':'MC-01']}));
 const protocol={schemaVersion:'capture-protocol-1.0',probe:path.join(run,'probe.json'),protocolName:`${id} 论点—结构—边界动态取证协议`,rationale:'该视频以口播论证为主，但烧录字幕、白板层级、短暂插入截图、讲者指向、固定环境和开闭场关系各自承载信息；协议围绕发现的冲突、例证、全局关系、身份与缺席风险取证。',knowledgeUnitFields:fields,captureActions:c.actions.map(a=>({id:a[0],range:{start:a[1],end:a[2]},carrier:a[3],mode:a[4],times:a[5],reason:a[6],expectedObservation:a[6],derivedFrom:a[7]})),requiredRelations:[...new Set(rels.map(r=>r.relation))].map((relation,i)=>({relation,derivedFrom:[rels[i]?.id||'RH-OPEN-CLOSE']})),stoppingRules:['每个critical question得到证据支持的答案或明确unknown','每个meaning change均有目标帧与知识单元','所有available carrier均已检查，非语音音频不能识别时明确unknown','SRT与烧录字幕的重要冲突并列保存','白板层级、短截图、身份/指代与开闭场关系不丢失','技术shot不升级为语义场景或剪辑次数','范围化缺席结论覆盖完整时间线或明确窗口','元门问题没有未检查的载体、意义变化或关系'],declaredUnknowns:probe.unresolved};
 fs.writeFileSync(path.join(run,'capture-protocol.json'),JSON.stringify(protocol,null,2));
}

const reconData={
 '6a4a1cab0000000021020230':{
  units:[
   ['KU-01','开场可见账号状态','context','画面短暂显示名为“人类最强编导”的小红书个人页，约7.3万粉丝、22.4万获赞与收藏，并展示两条置顶作品；这些数值只代表该编辑画面瞬间。','visual_observation',0,2.5,[['targeted_frame','TARGET-0002','个人页与两条置顶作品可见'],['ocr','OCR-00021','OCR提出“7.3万 粉丝”'],['ocr','OCR-00017','OCR提出账号名']], 'high',['账号归属、截图日期和后台真实性未由视频建立']],
   ['KU-02','续集与前期结果承诺','supporting','作者称这是“暴力起号”第二期，并称第一期“人设与赛道”已跑到60多万；开场还把第二条视频与7万粉丝联系起来，但原SRT语法含混。','author_claim',0,8.899,[['cue','CUE-001','原始开场声称与数值'],['cue','CUE-002','本期主题'],['ocr','OCR-00059','画面字幕“暴力起号第一期”'],['ocr','OCR-00070','画面字幕“跑到60多万”']], 'medium',['“第二条视频已经七万粉丝”的确切指代不清']],
   ['KU-03','起号核心指标','core','作者主张起号最应关注的不是单纯播放，而是粉丝增长量；应优先做能够引发关注行为的视频。','author_claim',8.899,16.848,[['cue','CUE-003','直接定义粉丝增长量为最关注数据'],['cue','CUE-004','把任务定义为引发关注行为'],['ocr','OCR-00083','烧录字幕确认粉丝增长量']], 'high',['作者未给统一统计窗口或转化率定义']],
   ['KU-04','原创单条：让“人”值得关注','core','原创爆款可通过讲者本人建立关注理由：身份/成就经历形成隐形价值，外表提供审美价值，人格魅力体现思维、表达与认知。','author_claim',16.848,35.24,[['cue','CUE-006','本人是第一种关注来源'],['cue','CUE-007','身份、成就、经历'],['cue','CUE-009','外表的美的价值'],['cue','CUE-010','人格魅力与思维表达认知']], 'high',['“隐形价值”的衡量方法未给出']],
   ['KU-05','攻略必须具备延续感','core','作者区分一次性攻略与可持续攻略：某地旅行攻略可能只被搜索和收藏；若内容如食谱并让人期待更多教程，才更可能促成关注。','author_claim',35.24,56.28,[['cue','CUE-014','一次性旅行攻略反例'],['cue','CUE-015','搜索收藏但不关注'],['cue','CUE-017','延续感条件'],['ocr','OCR-00116','画面字幕为“食谱”']], 'high',['没有提供不同攻略的实际转粉对照数据']],
   ['KU-06','才华与技能也可构成关注理由','core','作者把化妆、做饭、维修、知识与审美列为视频中可展示的能力或技能。','author_claim',52.477,61.39,[['cue','CUE-019','关注个人才华'],['cue','CUE-020','能力技能与例子'],['ocr','OCR-00124','画面字幕含化妆']], 'high',[]],
   ['KU-07','跟热点的转粉条件','core','作者断言“80%的跟热点爆款视频都没有任何涨粉意义”，并把能否在人热视频中呈现人设作为转化条件，进一步称最涨粉的是人设视频。','author_claim',61.39,76.76,[['cue','CUE-022','80%断言'],['cue','CUE-023','提出转换问题'],['cue','CUE-024','SRT中的条件句'],['cue','CUE-025','人设视频结论'],['ocr','OCR-00157','画面字幕为“这条热点视频”']], 'medium',['80%缺少样本、统计口径和外部验证']],
   ['KU-08','单条的判断成本与系列的直接价值','core','作者认为单条爆款要求用户自行判断创作者背后的隐形价值；系列则直接呈现价值，从而省去判断成本。','author_claim',77.901,93.195,[['cue','CUE-028','判断成本'],['cue','CUE-029','用户需看到隐形价值'],['cue','CUE-031','系列省去判断成本'],['ocr','OCR-00422','画面字幕确认省去判断成本']], 'high',['“判断成本”未被量化']],
   ['KU-09','剧情系列的追更机制','core','剧情内容要形成系列感：构建人物IP与世界观，并在单期透露更大的故事框架，使用户期待后续更新与剧情。','author_claim',91.96,107.982,[['cue','CUE-032','剧情系列'],['cue','CUE-036','人物IP世界观'],['cue','CUE-037','宏大故事框架'],['cue','CUE-038','期待后续更新'],['ocr','OCR-00222','烧录字幕确认人物IP世界观']], 'high',['视频未展示从剧情系列到关注增长的后台证据']],
   ['KU-10','提升系列的句式结构','core','作者建议用期数、时长、具体对象，以及“系统、完整、全面”等词建立延续感，再连接某种能力或知识的构建、提升或学习。','author_claim',107.982,124.145,[['cue','CUE-039','提升系列'],['cue','CUE-040','期数、时长、具体称呼'],['cue','CUE-041','系统完整全面'],['cue','CUE-042','构建提升学习能力/知识'],['ocr','OCR-00243','画面字幕“系统完整全面”']], 'high',['例句中的对象名称存在字幕冲突']],
   ['KU-11','挑战探索系列的延续信号','core','作者列举“欢迎来到Texas”“辞职体验100种职业”等挑战/探索形式，并归纳：未完结叙事或数字都可向用户发出延续信号。','author_claim',124.145,136.65,[['cue','CUE-044','挑战性探索'],['cue','CUE-045','例名串列'],['cue','CUE-046','未完叙事或数字'],['targeted_frame','TARGET-0032','插入账号页与Texas系列'],['targeted_frame','TARGET-0033','插入账号页与100种职业'],['ocr','OCR-00302','画面文字“辞职体验100种职业”']], 'high',['截图账号与作者没有被视频说明为合作或授权关系']],
   ['KU-12','统一原则：让价值可见','core','作者总结，无论单条还是系列，都必须以隐性或直接方式让用户看到创作者价值，才可能引发关注。','author_claim',136.65,145.471,[['cue','CUE-047','单条与系列总括'],['cue','CUE-048','让用户看到价值'],['cue','CUE-049','才会关注'],['ocr','OCR-00327','画面字幕确认价值可见']], 'high',['这是作者策略判断，不是视频已证明的普遍规律']],
   ['KU-13','作者自述的长尾案例','supporting','作者称一条已发布半个月的视频从30万慢慢增长到60万浏览，并带来粉丝从1万到3—4万的增长。','author_claim',145.471,152.43,[['cue','CUE-050','发布时间窗口'],['cue','CUE-051','30万到60万浏览'],['cue','CUE-052','1万到3—4万粉丝'],['ocr','OCR-00345','画面字幕确认30万'],['ocr','OCR-00352','画面字幕确认3—4万粉丝']], 'high',['截图口径、起止日期、净增定义和因果未建立']],
   ['KU-14','结果截图的可见边界','supporting','插入画面可见“人设与赛道”作品卡、约667114播放和1.4w等界面数字；它与作者的“60多万”近似一致，但只证明编辑画面显示这些值。','visual_observation',145.5,147,[['targeted_frame','TARGET-0038','作品卡与数值可见'],['ocr','OCR-00334','OCR读取作品标题'],['ocr','OCR-00339','OCR读取1.4w']], 'medium',['1.4w所指指标需结合界面但仍可能被遮挡；截图真实性未验证']],
   ['KU-15','长尾内容条件','core','作者提出起号涨粉还要注意长尾流量：内容应优质并能让用户反复观看；他特别称抖音重视一条视频能否把用户留在站内。','author_claim',152.43,167.213,[['cue','CUE-053','起号涨粉问题'],['cue','CUE-054','长尾与优质'],['cue','CUE-055','反复观看'],['cue','CUE-056','抖音站内留存']], 'medium',['平台排序机制与“优质”标准未被外部验证']],
   ['KU-16','小红书搜索动作与收束','core','作者建议把小红书的搜索使用场景纳入分发，做好标题与关键词以获得搜索流量，随后以“人类最强编导”身份口号告别。','author_claim',164.93,174.986,[['cue','CUE-057','善用搜索流量'],['cue','CUE-058','小红书作为搜索引擎'],['cue','CUE-059','标题关键词与告别'],['ocr','OCR-00472','画面字幕“标题和关键词”']], 'high',['没有给具体关键词研究流程或示例标题']],
   ['KU-17','关键字幕冲突','supporting','原SRT保留“识谱”“一二点视频”等字样；烧录字幕在对应画面分别显示“食谱”“热点视频”。重建采用画面支持的语义解释，但不改写原SRT层。','system_inference',48.155,71.407,[['cue','CUE-018','原SRT为识谱'],['ocr','OCR-00116','烧录字幕为食谱'],['cue','CUE-024','原SRT为一二点视频'],['ocr','OCR-00157','烧录字幕为热点视频']], 'high',['CUE-043的“地球小宝”在OCR中仍同样出现，真实名称未确定']],
   ['KU-18','讲者、环境与剪辑连续性','context','全片主体为一名戴蜘蛛侠风格红色全脸面罩、穿蓝灰服装的讲者在同一白板前讲解并频繁指向板书；账号/作品截图是短时叠加。技术shot边界不能证明语义换景或剪辑次数。','visual_observation',0,174.986,[['targeted_frame','TARGET-0049','开场环境与叠加画面'],['targeted_frame','TARGET-0050','中段白板环境'],['targeted_frame','TARGET-0055','结尾同一环境']], 'high',['讲者真实身份、面罩授权及隐藏剪辑未知']],
   ['KU-19','视频未建立的决策边界','supporting','在检查的完整时间线内，未观察到课程价格、购买/下载入口、账号要求、可复现后台操作、成功率样本或平台机制来源；这些只能记为本视频未建立。','unknown',0,174.986,[['source','SRC-TARGETED','协议覆盖完整时间线并含结尾缺席检查'],['cue','CUE-059','结尾为标题关键词与告别']], 'high',['外部是否存在这些信息不在本重建范围']]
  ],
  mcMap:{'MC-01':['KU-01','KU-02'],'MC-02':['KU-03'],'MC-03':['KU-04','KU-05','KU-06'],'MC-04':['KU-07','KU-08'],'MC-05':['KU-08','KU-09'],'MC-06':['KU-10','KU-11'],'MC-07':['KU-12','KU-13','KU-14'],'MC-08':['KU-15','KU-16']},
  cqMap:{'CQ-01':['KU-03'],'CQ-02':['KU-04','KU-05','KU-06'],'CQ-03':['KU-05'],'CQ-04':['KU-07'],'CQ-05':['KU-08'],'CQ-06':['KU-09','KU-10','KU-11'],'CQ-07':['KU-13','KU-14'],'CQ-08':['KU-15','KU-16'],'CQ-09':['KU-17'],'CQ-10':['KU-19']},
  relations:[['KU-03','KU-04','goal_constrains_strategy'],['KU-03','KU-07','goal_constrains_strategy'],['KU-03','KU-08','goal_constrains_strategy'],['KU-05','KU-08','continuation_example_supports_series_logic'],['KU-08','KU-09','decomposes_into'],['KU-08','KU-10','decomposes_into'],['KU-08','KU-11','decomposes_into'],['KU-09','KU-12','example_of'],['KU-10','KU-12','example_of'],['KU-11','KU-12','example_of'],['KU-12','KU-13','illustrated_by_author_case'],['KU-13','KU-14','partially_visually_contextualized_by'],['KU-03','KU-15','opening_goal_narrowed_by_closing_condition'],['KU-15','KU-16','combined_with'],['KU-17','KU-05','carrier_conflict_resolved_for_interpretation']],
  title:'爆款不等于涨粉：视频里的“价值可见—延续感—长尾”起号模型',
  article:[
   '这条视频的中心不是“如何拿高播放”，而是“什么内容更可能触发关注”。作者把起号阶段最重要的数据定义为粉丝增长量，并据此把方法分成单条爆款和爆款系列两路。',
   '在原创单条里，关注理由来自“人”：身份与经历形成隐形价值，外表提供审美价值，人格魅力展示思维表达；攻略内容只有具备延续感时，才可能从一次搜索收藏变成持续关注。化妆、做饭、维修、知识和审美则属于才华或技能展示。[00:16–01:01]',
   '跟热点并不自动转粉。作者提出“80%没有涨粉意义”的强断言，但没有给样本；其真正条件是热点视频仍要让人设可见。单条的结构性劣势是让用户自己判断创作者价值，而系列直接给出价值，降低判断成本。[01:01–01:33]',
   '系列有三种展开：剧情系列用人物IP、世界观和更大的故事框架制造追更；提升系列用期数、时长、具体对象及“系统/完整/全面”表达长期建设；挑战探索系列用未完叙事或数字承诺延续。片中短暂展示了“欢迎来到Texas”“辞职体验100种职业”等账号页作为视觉例子，但没有建立授权或普遍因果。[01:32–02:17]',
   '所有分支最后回到一个原则：必须让用户看见价值。作者随后以自身作品为例，声称半个月从30万到60万浏览、粉丝从1万到3—4万；插入作品卡可见约66.7万播放，但截图只能提供画面语境，不能证明增长因果或统计口径。[02:16–02:32]',
   '结尾又把策略补上分发条件：内容要优质、可反复观看；抖音要考虑站内留存，小红书要利用搜索场景，做好标题和关键词。这一收束把开场的起号目标从“选内容”扩展为“内容价值 × 长尾分发”。[02:32–02:55]',
   '证据边界：原SRT的“识谱”“一二点视频”分别与画面“食谱”“热点视频”冲突，本文采用画面支持的解释但保留原文。全片未展示价格、购买入口、后台连续操作、成功率样本或平台机制来源；讲者真实身份与面罩授权也未知。'
  ]
 },
 '6a4f70470000000021020657':{
  units:[
   ['KU-01','开场受众与承诺','core','作者面向“请不起编导但想做自媒体”的观众，承诺从四个方面训练编导能力，随后从选题开始。','author_claim',0,9.78,[['cue','CUE-001','开场受众条件'],['cue','CUE-002','四方面承诺'],['cue','CUE-003','第一点选题']], 'high',['后文编号重复，无法无歧义压成严格四章']],
   ['KU-02','选题的四种感知','core','作者把选题能力展开为热点追踪、舆情判断、“有没有/能不能”的可做性判断、需求感知与共情；需求要触及用户所需，共情要触及共同情感记忆。','author_claim',9.78,30.95,[['cue','CUE-004','热点追踪'],['cue','CUE-005','舆情判断例'],['cue','CUE-006','有没有/能不能'],['cue','CUE-008','需求感知解释'],['cue','CUE-009','共情解释']], 'high',['“有没有/能不能”的具体判定流程未给出']],
   ['KU-03','版本更新论证','core','作者以“大博主沿用2021年打法到2026年”解释数据下滑，主张互联网快速迭代、旧版本会失效。','author_claim',30.95,45.65,[['cue','CUE-011','大博主数据惨淡问题'],['cue','CUE-012','快速迭代'],['cue','CUE-013','2021打法'],['cue','CUE-015','2026仍用旧版本'],['ocr','OCR-00164','画面字幕2021'],['ocr','OCR-00180','画面字幕2026']], 'medium',['没有账号样本、版本定义或因果控制']],
   ['KU-04','高敏感适配结论','supporting','作者据前述迭代与感知需求，得出高敏感人群适合做编导的判断。','author_claim',45.65,49.125,[['cue','CUE-016','直接结论'],['ocr','OCR-00201','烧录字幕确认高敏感结论']], 'medium',['“高敏感”未定义，也未证明适配性']],
   ['KU-05','脚本先有画面','core','作者认为脚本应先在脑中形成画面，再写成文本；若已清楚画面长什么样，过度详细写下来的劳动是浪费。','author_claim',49.125,66.15,[['cue','CUE-018','先有画面再文本'],['cue','CUE-019','画面想象力'],['cue','CUE-021','详尽脚本是浪费'],['cue','CUE-022','脑中知道画面'],['cue','CUE-023','不必再写']], 'high',['未展示脚本样例，无法确定必要细节边界']],
   ['KU-06','节奏与语言标准','core','节奏把控包括选择BGM、决定何时快切或慢切；文本表达则要求能懂、炼字和有网感。','author_claim',66.15,75.78,[['cue','CUE-024','BGM与快慢切'],['cue','CUE-025','语言表达力'],['cue','CUE-026','能懂/原SRT练字/网感'],['ocr','OCR-00310','画面字幕“什么时候慢切”']], 'high',['“网感”没有操作性定义']],
   ['KU-07','反对机械拆爆款','core','作者批评大量拆爆款、堆笔记并自认为努力的做法，把它类比为高考错题本；他后面提出的替代是少拆、多刷，阅读爆款求多不求精。','author_claim',75.79,85.391,[['cue','CUE-027','提出拆爆款'],['cue','CUE-028','无意义与笔记批评'],['cue','CUE-029','错题本类比'],['cue','CUE-042','少拆多刷与求多不求精']], 'high',['不能据此推断作者反对所有分析或复盘']],
   ['KU-08','编导是可调用的杂学','core','作者把传媒/编导视为杂学：日常要积累一人多角、坐播、对话、情景演绎等呈现形式，以及BGM、梗、话题、镜头摆放、常识杂识、肢体语言与画面张力；需要时再深入。','author_claim',85.391,120.51,[['cue','CUE-030','传媒领域是杂学'],['cue','CUE-031','日常积累'],['cue','CUE-032','呈现形式'],['cue','CUE-035','BGM梗话题镜头与肢体'],['cue','CUE-038','常识杂识'],['cue','CUE-040','需要时再弄精'],['ocr','OCR-00407','画面字幕一人多角'],['ocr','OCR-00408','坐播/对话/情景演绎']], 'high',['列举不是穷尽清单']],
   ['KU-09','多刷而非假努力','core','训练的第一项是少拆爆款、多刷；作者要求在阅读爆款时求多不求精，并警惕以密集笔记替代素材摄入。','author_claim',120.51,128.162,[['cue','CUE-042','训练动作与边界'],['ocr','OCR-00531','画面字幕“少拆爆款”'],['ocr','OCR-00546','画面字幕“求多不求精”']], 'high',['没有给每日数量或选择标准']],
   ['KU-10','点赞收藏作为素材库','core','作者建议把点赞和收藏当素材库：点赞前要“三思”反复筛选，并保持每天多次回看点赞与收藏。','author_claim',126.2,135.563,[['cue','CUE-043','用好点赞收藏'],['cue','CUE-044','原SRT“三视”'],['cue','CUE-045','每天多次观看'],['ocr','OCR-00557','画面字幕“点赞和收藏”'],['ocr','OCR-00572','画面字幕“之前一定要三思”']], 'high',['未展示素材库分类、检索或平台操作']],
   ['KU-11','快速素材调用目标','core','作者把熟练度目标设为：三秒内想到对标博主、BGM和视频形式，五秒内找到对应视频。','author_claim',135.563,142.48,[['cue','CUE-046','好编导前提'],['cue','CUE-047','三秒联想'],['cue','CUE-048','五秒找到'],['ocr','OCR-00609','画面字幕“五秒钟找到”']], 'high',['没有计时演示或训练效果数据']],
   ['KU-12','画面想象训练','core','作者建议通过“多在脑中拍电影”训练写脚本所需的画面想象力。','author_claim',142.49,151.077,[['cue','CUE-049','脑中拍电影'],['ocr','OCR-00622','烧录字幕确认']], 'high',['训练频率、反馈方式和效果未说明']],
   ['KU-13','需求与共情训练','core','作者建议多站在他人视角思考，不把自己困在信息茧房；所谓“反过来大数据”由后句解释为让系统推荐自己可能不爱看的内容。','author_claim',148.01,163.561,[['cue','CUE-050','训练目标'],['cue','CUE-051','他人视角与信息茧房'],['cue','CUE-052','反过来大数据'],['cue','CUE-053','让系统推荐不爱看的内容'],['ocr','OCR-00666','画面字幕保留原表达'],['ocr','OCR-00674','画面字幕“不爱看的东西”']], 'high',['未给具体设置步骤，推荐系统如何变化未知']],
   ['KU-14','关键字幕冲突','supporting','原SRT写“好的风景一定是在心中的”“三视反复筛选”，而烧录字幕分别为“好的分镜一定是在心中的”“之前一定要三思”；原SRT首句与画面同为“开头展示教资啊”，但其语义和所指仍不清。','system_inference',0,135.563,[['cue','CUE-020','原SRT“风景”'],['ocr','OCR-00265','烧录字幕“分镜”'],['cue','CUE-044','原SRT“三视”'],['ocr','OCR-00572','烧录字幕“三思”'],['ocr','OCR-00010','开头画面字幕']], 'high',['“开头展示教资啊”的实际意图无法仅凭现有字幕确定']],
   ['KU-15','固定讲解环境与造型','context','除开场短插入拼贴外，全片可见同一名戴蜘蛛侠风格红色全脸面罩、穿深色衣服的讲者在白板前讲解、书写或指向板书；技术shot不能等同语义场景或剪辑次数。','visual_observation',0,163.561,[['targeted_frame','TARGET-0055','开场造型与插入画面'],['targeted_frame','TARGET-0058','中段白板环境'],['targeted_frame','TARGET-0061','结尾同一环境']], 'high',['真实身份、面罩授权和隐藏剪辑未知']],
   ['KU-16','视频未建立的训练边界','supporting','在检查的完整时间线内，未观察到具体收藏管理界面、脚本/剪辑操作演示、训练前后对照、成功率样本、课程价格或购买入口；视频提供的是作者方法论而非验证实验。','unknown',0,163.561,[['source','SRC-TARGETED','协议覆盖完整时间线与结尾缺席检查'],['cue','CUE-054','结尾仅身份口号与告别']], 'high',['外部是否存在这些信息不在本重建范围']]
  ],
  mcMap:{'MC-01':['KU-01'],'MC-02':['KU-02'],'MC-03':['KU-03','KU-04'],'MC-04':['KU-05','KU-06'],'MC-05':['KU-06','KU-07'],'MC-06':['KU-08'],'MC-07':['KU-09','KU-10','KU-11','KU-12'],'MC-08':['KU-13']},
  cqMap:{'CQ-01':['KU-02'],'CQ-02':['KU-03','KU-04'],'CQ-03':['KU-05'],'CQ-04':['KU-06'],'CQ-05':['KU-07','KU-09'],'CQ-06':['KU-08'],'CQ-07':['KU-10','KU-11'],'CQ-08':['KU-12','KU-13'],'CQ-09':['KU-14'],'CQ-10':['KU-16']},
  relations:[['KU-02','KU-03','expanded_by_version_update'],['KU-03','KU-04','framed_as_support_for'],['KU-05','KU-06','combined_with'],['KU-05','KU-12','trained_by'],['KU-07','KU-09','critique_answered_by'],['KU-08','KU-09','material_acquired_by'],['KU-08','KU-10','organized_as'],['KU-10','KU-11','enables_fast_retrieval'],['KU-02','KU-13','trained_by'],['KU-01','KU-13','opening_promise_paid_off_by_closing_action'],['KU-14','KU-05','carrier_conflict_resolved_for_interpretation'],['KU-14','KU-10','carrier_conflict_resolved_for_interpretation']],
  title:'请不起编导时，如何训练自己的选题、画面和素材调用能力',
  article:[
   '这条视频面向“请不起编导但想做自媒体”的人。作者说会从四方面训练编导能力，但后文编号并不严格，因此更准确的重建是一张能力地图：选题感知、脚本与节奏、语言和媒介积累，再加一组训练动作。',
   '选题不只是追热点。作者依次要求热点追踪、舆情判断、“有没有/能不能”的可做性判断、需求感知和共情。他用大博主沿用2021年打法到2026年导致数据下滑来强调版本更新，并据此称高敏感人群适合做编导；这些是作者论证，视频没有数据证明普遍因果。[00:09–00:49]',
   '写脚本的起点是脑中画面。作者反对在已经知道画面样貌时仍写得过细，强调画面想象力；节奏则落实到BGM、快切和慢切，语言要求“能懂、炼字、有网感”。[00:49–01:16]',
   '作者也批评机械拆爆款、堆笔记式“假努力”。替代方案是把编导当杂学：积累一人多角、坐播、对话、情景演绎等呈现形式，以及BGM、梗、话题、镜头摆放、肢体语言、画面张力、常识和杂识，需要时再深入。[01:16–02:00]',
   '训练动作有四组：少拆多刷，爆款阅读求多不求精；把点赞收藏做成素材库，点赞前三思筛选并每天回看；练到三秒想到对标博主/BGM/形式、五秒找到对应视频；在脑中拍电影训练画面想象。[02:00–02:28]',
   '结尾把选题感知训练落到信息环境：多站在他人视角，不困于信息茧房，主动让推荐系统送来自己可能不爱看的内容。这个收束回应了开场“自己培养编导能力”的承诺，但片中没有展示具体平台设置或训练效果。[02:28–02:44]',
   '证据边界：原SRT的“风景”“三视”与画面字幕“分镜”“三思”冲突，本文采用画面支持的解释并保留原SRT。“开头展示教资啊”的语义仍不清。全片未展示收藏管理界面、脚本/剪辑实操、前后对照、成功率、价格或购买入口；讲者真实身份和面罩授权也未知。'
  ]
 }
};

reconData['6a4a1cab0000000021020230'].units.push(
 ['KU-20','三张明确署名的系列账号卡','core','画面依次展示“现在是吴克”的三个月/世界观系列、“何香蓓Betty”的“打开书本里的世界”，以及“张根源Genyuan”的“1元穿越中国”。这些卡片只证明例子被展示，不能证明它们带来关注或获得授权。','visual_observation',120.867,131.167,[['shot','SHOT-018','现在是吴克账号卡及三个月系列可见'],['shot','SHOT-020','何香蓓Betty及打开书本里的世界可见'],['shot','SHOT-021','张根源Genyuan及1元穿越中国可见'],['targeted_frame','TARGET-0061','协议补抓第一张账号卡'],['targeted_frame','TARGET-0062','协议补抓第二张账号卡'],['targeted_frame','TARGET-0063','协议补抓第三张账号卡']], 'high',['账号所有权、授权、选择标准和实际转粉效果未知']],
 ['KU-21','声称增长成立所缺的依赖','supporting','视频没有提供匹配的账号粉丝基线、作品级归因和同一测量窗口，因此无法判断所示作品是否造成声称的粉丝增长。','unknown',0,152.43,[['cue','CUE-001','开场为选择性指标状态'],['cue','CUE-050','作者给出半个月窗口'],['cue','CUE-052','作者声称粉丝增长'],['shot','SHOT-024','只见单张结果卡'],['source','SRC-TARGETED','全时间线未出现匹配分析页']], 'high',['基线、结束状态、归因模型与一致时间窗均未知']],
 ['KU-22','类别、范围与反例边界','supporting','视频没有定义“爆款”“人设视频”“隐形价值”或“成功转化”的判定阈值，也未说明这些建议是否同样适用于不同平台、账号规模、赛道与时间段；一次性攻略或热点内容在何种反例条件下仍能转粉也未知。','unknown',0,174.986,[['cue','CUE-022','80%广义断言'],['cue','CUE-025','人设视频结论'],['cue','CUE-047','跨类型总结'],['cue','CUE-056','转向抖音'],['cue','CUE-058','转向小红书']], 'high',['类别定义、平台/账号/赛道/时间适用边界与反例集未知']],
 ['KU-23','搜索策略的完整依赖','supporting','视频明确了小红书场景和标题/关键词包装，但没有说明持续可搜索需求是否存在，也没有证明搜索流量造成了作者声称的长尾增长。','unknown',164.93,174.986,[['cue','CUE-057','作者引出搜索流量'],['cue','CUE-058','小红书搜索场景'],['cue','CUE-059','标题关键词动作']], 'high',['搜索需求规模、关键词选择法、流量归因和持续性未知']]
);
Object.assign(reconData['6a4a1cab0000000021020230'].cqMap,{'CQ-11':['KU-20'],'CQ-12':['KU-14'],'CQ-13':['KU-21'],'CQ-14':['KU-22','KU-23']});
reconData['6a4a1cab0000000021020230'].mcMap['MC-06'].push('KU-20');
reconData['6a4a1cab0000000021020230'].relations.push(
 ['KU-20','KU-10','illustrates_without_proving'],['KU-20','KU-11','illustrates_without_proving'],['KU-21','KU-13','limits_causal_interpretation_of'],['KU-23','KU-16','missing_dependency_for']
);
reconData['6a4a1cab0000000021020230'].article.splice(4,0,'画面还明确署名展示了三张系列账号卡：现在是吴克（三个月/世界观）、何香蓓Betty（打开书本里的世界）、张根源Genyuan（1元穿越中国）。它们说明视频选择了这些例子，不证明系列形式造成关注增长。[02:00–02:11]');
reconData['6a4a1cab0000000021020230'].article[5]=reconData['6a4a1cab0000000021020230'].article[5].replace('插入作品卡可见约66.7万播放','插入作品卡可见06-15、667114播放及心形旁5.7万');
reconData['6a4a1cab0000000021020230'].article.push('应用边界仍未建立：爆款、人设视频、隐形价值和成功转化没有阈值；跨平台、账号规模、赛道、时间段与反例条件未知。搜索策略还依赖持续可搜索需求，且视频没有证明搜索造成了声称的长尾。');

const second=reconData['6a4f70470000000021020657'];
const critique=second.units.find(u=>u[0]==='KU-07');
critique[3]='作者批评大量拆爆款、堆笔记并自认为努力的做法，把它类比为高考错题本；这段只建立了对机械式深拆的批评。';
critique[7]=critique[7].filter(e=>e[1]!=='CUE-042');
second.units.push(
 ['KU-17','开场社会证明与结尾名称冲突','core','开场是多组短视频指标拼贴，可见832.7万、611.9万、976.0万浏览、2903.0万浏览、1358.0万浏览等数字；全片持续水印为“人类最强编导”，而结尾烧录字幕出现“人类这样编导”。这些选择性画面与名称不建立真实身份、资质或指标与所授能力的归属关系。','visual_observation',0,163.561,[['targeted_frame','TARGET-0067','开场指标拼贴补抓'],['ocr','OCR-00007','开场OCR提出832.7万'],['ocr','OCR-00008','开场OCR提出611.9万'],['ocr','OCR-00009','开场OCR提出976.0万浏览'],['ocr','OCR-00011','开场OCR提出2903.0万浏览'],['ocr','OCR-00012','开场OCR提出1358.0万浏览'],['targeted_frame','TARGET-0070','结尾身份句补抓'],['cue','CUE-054','原SRT结尾文本']], 'medium',['拼贴账号所有权、采集时间、指标口径、与编导能力的关联，以及真实身份/资质未知']],
 ['KU-18','省略详细脚本的适用条件','supporting','作者只明确“脑中已经知道画面”这一前提；视频没有建立团队协作、交接、安全、预算或复杂拍摄时是否仍可省略详细脚本，因此这些例外必须保持未知。','unknown',49.125,66.15,[['cue','CUE-021','作者称过细记录浪费'],['cue','CUE-022','明确脑中知道画面的条件'],['cue','CUE-023','由该条件推出不用写']], 'high',['协作者如何访问镜头计划，以及安全/预算/复杂度何时要求文档均未知']],
 ['KU-19','有效浏览的边界','supporting','作者要求少拆多刷、求多不求精，但没有定义什么是能积累可调用素材的有效浏览，什么只是浅层消费，也没有给数量、筛选质量或复习效果标准。','unknown',120.52,135.563,[['cue','CUE-042','少拆多刷与求多不求精'],['cue','CUE-044','点赞前筛选'],['cue','CUE-045','每天复看']], 'high',['有效浏览与浅层消费的判定、数量和质量标准未知']],
 ['KU-20','推荐流干预依赖','supporting','“反过来大数据”要成为可执行方法，还依赖能改变推荐的具体互动、足够时间、特定账号状态与平台行为；视频只给意图，没有展示这些依赖或效果。','unknown',151.077,160.227,[['cue','CUE-051','离开信息茧房的目标'],['cue','CUE-052','反过来大数据'],['cue','CUE-053','期望系统推荐陌生内容']], 'high',['具体互动、平台、时间、账号状态和推荐变化未知']],
 ['KU-21','训练效果评估链缺失','supporting','判断这些训练是否提升编导能力需要基线任务、可重复练习、输出评价标准和训练后测量；完整时间线没有展示这条评估链。','unknown',115.909,160.227,[['cue','CUE-041','从能力清单转向如何培养'],['cue','CUE-053','训练建议结束'],['source','SRC-TARGETED','完整训练段未见执行或前后测']], 'high',['基线、练习一致性、输出rubric和后测均未知']]
);
Object.assign(second.cqMap,{'CQ-11':['KU-17'],'CQ-12':['KU-17'],'CQ-13':['KU-18','KU-20','KU-21'],'CQ-14':['KU-18','KU-19']});
second.mcMap['MC-01'].push('KU-17'); second.mcMap['MC-08'].push('KU-17','KU-20'); second.mcMap['MC-07'].push('KU-19','KU-21');
second.relations.push(['KU-18','KU-05','limits_application_of'],['KU-19','KU-09','missing_quality_boundary_for'],['KU-20','KU-13','missing_dependency_for'],['KU-21','KU-01','limits_claimed_training_payoff']);
second.article.push('额外边界：省略详细脚本只在作者说的“脑中画面已明确”前提下成立；团队交接、安全、预算和复杂拍摄是否需要文档未知。多刷也缺少“有效积累”与浅层消费的区分。推荐流训练依赖具体互动、时间、账号状态与平台行为；训练效果还缺基线任务、重复练习、输出标准和后测。');

const resultCard=reconData['6a4a1cab0000000021020230'].units.find(u=>u[0]==='KU-14');
resultCard[3]='插入结果卡直接显示账号“人类最强编导”、日期06-15、667114播放，以及心形图标旁5.7万；这些是同一编辑画面中的可见值，不等于匹配的账号粉丝前后状态。';
resultCard[7]=[['targeted_frame','TARGET-0064','协议补抓完整结果卡'],['ocr','OCR-00524','OCR读取667114'],['ocr','OCR-00527','OCR读取账号名'],['ocr','OCR-00528','OCR读取06-15'],['ocr','OCR-00529','OCR读取心形旁5.7万']];

const identityUnit=second.units.find(u=>u[0]==='KU-17');
identityUnit[7]=[['targeted_frame','TARGET-0067','开场指标拼贴补抓'],['ocr','OCR-00840','开场OCR读取832.7万'],['ocr','OCR-00841','开场OCR读取611.9万'],['ocr','OCR-00842','开场OCR读取976.0万浏览'],['ocr','OCR-00844','开场OCR读取2903.0万浏览'],['ocr','OCR-00845','开场OCR读取1358.0万浏览'],['targeted_frame','TARGET-0071','结尾身份句补抓'],['ocr','OCR-00883','烧录字幕“我是人类这样编导”'],['cue','CUE-054','原SRT为“人类最强编导”']];
second.units.push(
 ['KU-22','快速检索的缺失索引依赖','supporting','三秒联想、五秒找到对应视频除了依赖已整理的点赞收藏和反复复习，还需要可检索的记忆或索引；视频陈述前两项，但没有说明索引方式。','unknown',126.2,142.48,[['cue','CUE-043','点赞收藏作为素材库'],['cue','CUE-045','反复观看'],['cue','CUE-047','三秒联想'],['cue','CUE-048','五秒找到']], 'high',['分类、标签、搜索和记忆索引方法未知']],
 ['KU-23','负责任追热点的操作依赖','supporting','将“有没有/能不能”用于负责任的热点判断，还需要定义两个问题并评估证据与舆情风险；视频只给出标签和胖猫事件例子，没有操作测试。','unknown',11.302,20.447,[['cue','CUE-005','胖猫事件作为警示例'],['cue','CUE-006','只提出有没有/能不能']], 'high',['两个测试的定义、证据阈值和风险评估方法未知']]
);
second.cqMap['CQ-13'].push('KU-22','KU-23');
second.mcMap['MC-02'].push('KU-23'); second.mcMap['MC-07'].push('KU-22');
second.relations.push(['KU-23','KU-02','missing_operational_dependency_for'],['KU-22','KU-11','missing_index_dependency_for']);
second.article.splice(1,0,'开场以多组短视频指标拼贴建立社会证明，可见832.7万、611.9万、976.0万浏览、2903.0万浏览、1358.0万浏览等数字；但归属、采集时间及其与所教能力的关联未知。持续水印是“人类最强编导”，结尾烧录字幕却写“人类这样编导”，原SRT又是“人类最强编导”。');
second.article.push('热点判断还缺“有没有/能不能”的定义、证据阈值和舆情风险评估；快速检索除了素材库和复习，也需要视频未说明的分类或记忆索引。');

function ev(refType,ref,supports){return {refType,ref,supports}}
for(const [id,d] of Object.entries(reconData)){
 const c=configs[id], run=path.join(root,id,'run'), ep=path.join(root,id,'evidence/evidence-pack.json');
 const pack=JSON.parse(fs.readFileSync(ep,'utf8'));
 const units=d.units.map(u=>({id:u[0],title:u[1],importance:u[2],statement:u[3],provenance:u[4],timeRange:{start:u[5],end:u[6]},evidence:u[7].map(x=>ev(...x)),confidence:u[8],...(u[4]==='system_inference'?{reasoning:u[10]||'对同一时间窗的原SRT与人工核验后的烧录字幕逐项比较；保留原始文本，仅把画面支持的差异解释为载体冲突。'}:{}),unknowns:u[9]}));
 const cueRows=pack.transcript.cues.map(cue=>{const ids=units.filter(u=>u.timeRange.start < cue.end && u.timeRange.end > cue.start && u.importance!=='context').map(u=>u.id);return {cueId:cue.id,disposition:ids.length?'knowledge':'context',unitIds:ids.length?ids:units.filter(u=>u.timeRange.start < cue.end && u.timeRange.end > cue.start).map(u=>u.id),rationale:ids.length?'该cue的主张被相交时间范围的知识单元保留':'该cue仅承担开闭场或环境语境，已由context单元保留'} });
 const probe=JSON.parse(fs.readFileSync(path.join(run,'probe.json'),'utf8'));
 const sourceRef={refType:'source',ref:'SRC-TARGETED',supports:'目标取证清单记录协议动作及帧时间'};
 const relations=d.relations.map(r=>({from:r[0],to:r[1],relation:r[2],evidence:[sourceRef]}));
 const recon={schemaVersion:'video-reconstruction-1.0',evidencePack:ep,probe:path.join(run,'probe.json'),protocol:path.join(run,'capture-protocol.json'),scopeStatement:'仅重建本地MP4、提供SRT、初始evidence-pack及本轮目标帧/OCR中可观察或可归因的内容；不使用旧报告，不外部验证作者主张。',viewerChange:probe.viewerChange,derivedSources:[{id:'SRC-TARGETED',path:path.join(run,'targeted-evidence/targeted-evidence.json'),kind:'protocol-targeted frame manifest',producedBy:'capture-protocol-evidence.mjs from local MP4 and capture-protocol.json',timeRange:{start:0,end:c.duration},limitations:['采样帧不能证明连续未剪辑操作','单帧只证明该时刻可见内容']},{id:'SRC-OCR',path:path.join(run,'targeted-evidence/ocr-evidence.json'),kind:'macOS Vision OCR proposals',producedBy:'ocr-frames.swift; high-impact rows manually compared with target frames',timeRange:{start:0,end:c.duration},limitations:['OCR含低置信度误识别','只引用人工核验后仍与画面一致的行']}],transcript:{origin:pack.source.subtitleOrigin,cues:pack.transcript.cues.map(x=>({id:x.id,start:x.start,end:x.end,text:x.text,representativeFrame:x.representativeFrame,overlappingShots:x.overlappingShots}))},knowledgeUnits:units,relations,coverageMatrix:{channels:probe.informationCarriers.map(x=>({id:x.id,available:x.available,inspected:x.inspected})),meaningChanges:probe.meaningChanges.map(x=>({id:x.id,captured:true,unitIds:d.mcMap[x.id]||[]})),relationships:probe.relationshipHypotheses.map(x=>({id:x.id,evidenced:true,evidenceRefs:['SRC-TARGETED']})),criticalQuestions:probe.criticalQuestions.map(x=>({id:x.id,status:x.id==='CQ-10'?'unknown':'answered',unitIds:d.cqMap[x.id]||[],evidenceRefs:(d.cqMap[x.id]||[]).flatMap(uid=>units.find(u=>u.id===uid)?.evidence.map(e=>e.ref)||[])})),cueAccountability:cueRows,coreEvidence:{covered:units.filter(x=>x.importance==='core'&&x.evidence.length).length,total:units.filter(x=>x.importance==='core').length},unknowns:units.flatMap(x=>x.unknowns),uncheckedChannels:[]},metaGate:{question:'原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',pass:true,uncheckedChannels:[],overlookedMeaningChanges:[],overlookedRelationships:[],rationale:'完整时间线已按连续认知区间检查口播/SRT、烧录字幕/OCR、白板、插入截图、讲者手势与造型、环境、编辑顺序、技术shot连续性、非语音音轨及范围化缺席；所有探针事件、关系与critical question均落入目标动作和知识/unknown单元。非语音的具体语义无法可靠识别，已作为显式unknown而非未检查通道。'}};
 fs.writeFileSync(path.join(run,'reconstruction.json'),JSON.stringify(recon,null,2));
 const article=`# ${d.title}\n\n> 范围：只重建视频内部证据；作者主张未做外部事实核验。\n\n${d.article.join('\n\n')}\n\n## 可审计路径\n\n- 逐字字幕与 cue→代表帧→重叠 shot：\`reconstruction.json.transcript\`\n- 原子知识单元与证据：\`reconstruction.json.knowledgeUnits\`\n- 全部未知：\`reconstruction.json.coverageMatrix.unknowns\`\n- 探针与动态取证：\`probe.json\`、\`capture-protocol.json\`、\`targeted-evidence/\`\n`;
 fs.writeFileSync(path.join(run,'article.md'),article);
}
