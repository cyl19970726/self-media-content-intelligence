import fs from 'node:fs';
import path from 'node:path';

const runDir = path.dirname(new URL(import.meta.url).pathname);
const evidencePath = path.resolve(runDir, '../evidence/evidence-pack.json');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

const ev = (refType, ref, supports) => ({ refType, ref, supports });
const unit = (id, title, importance, statement, provenance, start, end, evidenceRefs, confidence, unknowns = [], extra = {}) => ({
  id, title, importance, statement, provenance,
  timeRange: { start, end }, evidence: evidenceRefs, confidence, unknowns, ...extra
});

const knowledgeUnits = [
  unit('KU-01', '角色化讲述画面与持续水印', 'context', '全片主要画面是一名穿黑衣、戴红色蜘蛛侠式面罩的人在明亮窗帘前坐着口播并配合手势；右上持续出现“人类最强编导”水印，左上出现“小红书”标识。', 'visual_observation', 0, 144.767, [ev('targeted_frame', 'TARGET-0001', '开场人物、面罩、室内设置及水印'), ev('targeted_frame', 'TARGET-0030', '结尾仍为同一类构图与水印')], 'high', ['面罩人物真实身份与造型授权未建立']),
  unit('KU-02', '中心命题：爆款本质是共情', 'core', '作者主张，不论赛道，爆款的共同逻辑不是钩子或网感，而是核心表达击中人类或部分人类的共同情感记忆；作者把这一点概括为“爆款的本质是共情”。', 'author_claim', 3.189, 18.899, [ev('cue', 'CUE-002', '否定钩子与网感'), ev('cue', 'CUE-003', '提出共同情感记忆'), ev('cue', 'CUE-005', '概括为爆款本质是共情')], 'high', ['视频内部未证明该解释对所有赛道成立'], {
    argument: { claim: '共同情感记忆驱动跨赛道爆款。', evidenceUnitIds: ['KU-07', 'KU-10', 'KU-13'], conditions: ['作者将对象范围扩展到人类或一部分人类'], counterexamples: [], actions: ['创作时优先寻找能共情用户的核心表达'], limits: ['三个被选案例只能说明作者如何解释它们，不能建立普遍因果律', '未比较其他爆款因素或失败案例'] }
  }),
  unit('KU-03', '视频承诺的论证方式', 'supporting', '作者说将分析“2026年上半年平台爆火的几大作品”，用以说明“爆款的本质是共情”。', 'author_claim', 11.241, 18.899, [ev('cue', 'CUE-004', '承诺分析2026年上半年作品'), ev('cue', 'CUE-005', '承诺说明中心命题')], 'high', ['“2026年上半年”及作品爆火程度未做外部核验']),
  unit('KU-04', '第一平台例证的可见范围', 'core', '约22.98—23.76秒插入一张小红书搜索结果页：搜索词清楚显示为“奥德赛时期”，可见多条相关结果，其中至少两条卡片旁显示“10万+”与“9.3万”；该页面没有显示“全话题浏览量超80亿”。', 'visual_observation', 22.98, 23.76, [ev('targeted_frame', 'TARGET-0034', '完整搜索结果页'), ev('ocr', 'OCR-00101', 'OCR提出并人工确认搜索词“奥德赛时期”'), ev('ocr', 'OCR-00108', 'OCR提出并人工确认“10万+”可见指标'), ev('ocr', 'OCR-00110', 'OCR提出并人工确认“9.3万”可见指标')], 'high', ['页面截图真实性、采集时点与完整结果规模未知']),
  unit('KU-05', '“奥德赛时期”的作者定义与来源说法', 'core', '作者把“奥德赛时期”解释为青年仍在摸索人生、一边自由一边迷茫的状态，并称这一说法由美国社会学家在2000年借古希腊奥德赛传说提出。', 'author_claim', 24.14, 32.093, [ev('cue', 'CUE-007', '摸索人生'), ev('cue', 'CUE-008', '自由与迷茫'), ev('cue', 'CUE-009', '来源说法')], 'high', ['概念首创者、年份和学术出处未在视频内证成']),
  unit('KU-06', '作者用中国古典文本建立跨时空类比', 'core', '作者声称这种青年迷茫并非新近或西方独有，并举二十多岁的屈原《离骚》“路漫漫其修远兮，吾将上下而求索”和二十五岁的王勃《滕王阁序》“关山难越，谁悲失路之人”为例。', 'author_claim', 32.093, 51.04, [ev('cue', 'CUE-010', '并非最近兴起'), ev('cue', 'CUE-011', '提出中国是否也有'), ev('cue', 'CUE-012', '屈原与《离骚》引文'), ev('cue', 'CUE-014', '王勃与《滕王阁序》'), ev('cue', 'CUE-015', '“谁悲失路之人”')], 'high', ['人物年龄、作品归属和引文准确性未外部核验']),
  unit('KU-07', '第一案例的因果归纳', 'core', '作者把年轻人的迷茫称为从古至今、所有人类共同的情感记忆，并以“万古同悲”“你我都能共情”为理由，断言“因为共情，所以这个话题必然爆款”。', 'author_claim', 51.05, 65.84, [ev('cue', 'CUE-016', '跨时代共同情感记忆'), ev('cue', 'CUE-017', '后之览者亦将有感'), ev('cue', 'CUE-018', '共情到必然爆款')], 'high', ['有限例子没有证明所有人类都共享该记忆，也没有证明“必然爆款”'], {
    argument: { claim: '奥德赛时期话题因跨时代青年迷茫共情而必然爆款。', evidenceUnitIds: ['KU-04', 'KU-05', 'KU-06'], conditions: ['作者将古典文本与当代青年状态视为同一情感结构'], counterexamples: [], actions: [], limits: ['搜索页只显示有限结果与互动数', '未提供对照话题、失败样本或因果排除'] }
  }),
  unit('KU-26', '“80亿”统计边界未知', 'supporting', '作者所称“浏览量超80亿”背后的数据来源、覆盖平台、统计日期窗口、浏览量/播放量/话题阅读量等指标定义均未在视频中给出；插入的小红书搜索页只显示若干结果与单条互动数，没有聚合80亿计数。', 'unknown', 18.899, 24.13, [ev('cue', 'CUE-006', '作者提出浏览量超80亿'), ev('targeted_frame', 'TARGET-0034', '该窗口内搜索页仅显示有限结果与单条指标')], 'high', ['数据来源未知', '平台覆盖范围未知', '日期窗口未知', '指标定义未知']),
  unit('KU-08', '第二平台例证的可见范围', 'core', '约68.9—69.5秒插入小红书搜索结果页，搜索栏可辨为“莉拉毕业照”；四个主要结果缩略图均围绕女性坐姿、毕业服饰或毕业场景，其中两个上方结果显示“10万+”，画面叠字出现“莉拉坐/女性成长”。', 'visual_observation', 68.9, 69.5, [ev('targeted_frame', 'TARGET-0044', '“莉拉毕业照”搜索结果页'), ev('targeted_frame', 'TARGET-0045', '同页及“女性成长”叠字'), ev('ocr', 'OCR-00271', 'OCR提出并人工确认首个“10万+”'), ev('ocr', 'OCR-00273', 'OCR提出并人工确认第二个“10万+”'), ev('ocr', 'OCR-00275', 'OCR提出并人工确认叠字“莉拉坐”')], 'high', ['单页不能证明参与者数量或群体代表性']),
  unit('KU-09', '作者讲述的莉拉失学与毕业照遗憾', 'core', '作者称该姿势来源于《我的天才女友》这部2011年的作品；其中莉拉是天赋极高的少女，却因重男轻女和贫困早早失去读书机会，一生渴望学历，却没能拥有婚纱之外的毕业照。', 'author_claim', 71.66, 87.499, [ev('cue', 'CUE-021', '姿势来源说法'), ev('cue', 'CUE-022', '2011年作品说法'), ev('cue', 'CUE-023', '天赋、贫困、重男轻女与失学'), ev('cue', 'CUE-024', '学历与毕业照遗憾')], 'high', ['作品载体、年份与角色事实未由视频内原片或来源证明']),
  unit('KU-10', '第二案例的群体纪念与爆款解释', 'core', '作者称当年有“数以万计”的女孩用该姿势拍毕业照，既纪念莉拉，也为女性群体在求学和工作中长期遭遇的不公平发声；作者进一步断言，一张图片和一段BGM之所以爆火，是因为它共情了“亿万女性共同的性别情感记忆”。', 'author_claim', 87.499, 101.18, [ev('cue', 'CUE-025', '数以万计女孩纪念莉拉'), ev('cue', 'CUE-026', '女性群体发声句的SRT原文'), ev('cue', 'CUE-027', '求学工作不公平'), ev('cue', 'CUE-028', '图片+BGM与亿万女性性别记忆')], 'high', ['页面未证明“数以万计”“亿万女性”或BGM的因果作用']),
  unit('KU-27', '莉拉姿势趋势的参与规模未知', 'supporting', '视频没有建立“数以万计的女孩”对应多少去重后的参与者或帖子、覆盖哪些平台、发生于哪个日期区间；所示小红书搜索页只呈现少量结果，不能推导参与总数或跨平台规模。', 'unknown', 68.9, 91.19, [ev('targeted_frame', 'TARGET-0044', '小红书搜索页只显示少量示例'), ev('cue', 'CUE-025', '作者提出数以万计的规模主张')], 'high', ['参与者/帖子去重口径未知', '平台覆盖未知', '趋势日期窗口未知']),
  unit('KU-28', 'CUE-028 的图片/BGM指代与边界', 'core', 'CUE-028中的“一张图片一段bgm”在上下文中指向前述“莉拉坐/莉拉毕业照”示例内容组合，而不是自动指向本视频自身的音轨；视频没有识别该示例所用的确切图片、确切BGM、版本或来源，因此这些字段保持未知。', 'unknown', 68.9, 101.18, [ev('targeted_frame', 'TARGET-0044', '前置莉拉毕业照示例页面'), ev('cue', 'CUE-028', '图片+BGM爆火的指代句')], 'high', ['确切图片未知', '确切BGM及版本未知', '图片/BGM来源和授权未知']),
  unit('KU-11', '“发生/发声”的载体冲突', 'supporting', 'SRT在CUE-026写作“更为纪念和发生的是女性群体”，但烧录字幕在相同语境显示“莉拉更为纪念和发声的…”，后者与下一句“女性群体…不公平待遇”衔接更通顺；逐字层仍保留SRT原文。', 'visual_observation', 91.2, 93.08, [ev('cue', 'CUE-026', 'SRT原文“发生”'), ev('targeted_frame', 'TARGET-0064', '烧录字幕“莉拉更为纪念和发声的”'), ev('ocr', 'OCR-00487', 'OCR提出并人工确认“莉拉更为纪念和发声的”')], 'high', ['烧录字幕句子跨帧，完整标点未知']),
  unit('KU-12', '第三平台作品页的可见范围', 'core', '约101.28—103.2秒插入一张小红书作品页：主体为蓝色调绘画；可见账号“@莫那手绘”、日期“6月7日”、点赞“2289.6万”、评论“36.5万”、收藏“173.6万”、分享“316.9万”。说明文字含“第323集”“哪有什么岁月静好，只是有人替我们负重前行”以及“#开国大典 #手绘 #青年创作者成长计划”；页上还可见歌曲标签“缘分一道桥”，歌手小字不完全可靠。', 'visual_observation', 101.28, 103.2, [ev('targeted_frame', 'TARGET-0051', '作品页完整状态'), ev('ocr', 'OCR-00385', 'OCR提出并人工确认点赞2289.6万'), ev('ocr', 'OCR-00387', 'OCR提出并人工确认评论36.5万'), ev('ocr', 'OCR-00391', 'OCR提出并人工确认收藏173.6万'), ev('ocr', 'OCR-00394', 'OCR提出并人工确认分享316.9万'), ev('ocr', 'OCR-00392', 'OCR提出并人工确认账号与日期'), ev('ocr', 'OCR-00393', 'OCR提出说明首行'), ev('ocr', 'OCR-00395', 'OCR提出标签行')], 'high', ['截图真实性、指标采集时点、作品授权和歌曲歌手完整文字未知']),
  unit('KU-29', '绘画页可见账号不等于创作者归属', 'supporting', '页面上可见的账号标签是“@莫那手绘”，但视频没有建立该账号是否为画作的原创作者或权利人，也没有给出画作的确切作品名、原始发布来源、创作/转载语境或授权链；可见账号标签与创作者/作品/来源归属必须分开。', 'unknown', 101.19, 103.2, [ev('cue', 'CUE-029', '作者仅称其为千万点赞的画画作品'), ev('targeted_frame', 'TARGET-0051', '可见作品页与账号标签'), ev('ocr', 'OCR-00392', 'OCR提出并人工确认“@莫那手绘 6月7日”')], 'high', ['原创作者身份未知', '确切作品身份未知', '原始来源与上下文未知', '授权/转载关系未知']),
  unit('KU-13', '第三案例的民族情感记忆解释', 'core', '作者称，平台年轻人即使没有经历抗日战争和开国大典，对民族“回忆”的刻骨铭心和伟大复兴的骄傲仍无视年龄、性别、身份；他把这解释为作品共情了中国人民共同的民族情感记忆。', 'author_claim', 103.061, 114.11, [ev('cue', 'CUE-030', '未亲历战争和开国大典'), ev('cue', 'CUE-031', '民族回忆与复兴骄傲'), ev('cue', 'CUE-032', '无视年龄性别身份及民族情感记忆')], 'high', ['作品页仅展示一个高互动例子，不能证明跨全部年龄、性别、身份的普遍性']),
  unit('KU-14', '“平台/平凡”的载体冲突', 'supporting', 'SRT在CUE-030写作“即使现在平台的年轻人”，烧录字幕显示“即使现在平凡的年轻人”；视频没有额外证据消除二者差异，因此重建正文在转述作者论证时保留冲突，不静默择一为逐字原文。', 'visual_observation', 103.061, 106.27, [ev('cue', 'CUE-030', 'SRT原文“平台的年轻人”'), ev('targeted_frame', 'TARGET-0066', '烧录字幕“平凡的年轻人”'), ev('ocr', 'OCR-00493', 'OCR提出并人工确认“即使现在平凡的年轻人”')], 'high', []),
  unit('KU-15', '从技巧崇拜转向艺术核心表达', 'core', '作者认为创作者过度关注网感、梗、钩子、标题等，反而忘了自媒体作品也是艺术作品；他主张好的艺术作品一定要有能共情共同情感记忆、具有“生命的感发”的核心表达。', 'author_claim', 114.12, 129.86, [ev('cue', 'CUE-033', '提出如何做爆款与好内容'), ev('cue', 'CUE-034', '过度关注网感梗'), ev('cue', 'CUE-035', '钩子标题与走得太远'), ev('cue', 'CUE-036', '自媒体作品也是艺术作品'), ev('cue', 'CUE-037', '好艺术与共同情感记忆')], 'high', ['“一定”是作者的规范性强主张，视频没有讨论不以共情为核心的艺术或内容']),
  unit('KU-16', '形式、媒介与核心表达的层级', 'core', '作者区分了三个层级：短视频只是表达形式，自媒体平台只是媒介，而真正好的核心表达可在诗词、书籍、影视等媒介形式间共通。', 'author_claim', 129.87, 136.497, [ev('cue', 'CUE-038', '短视频是表达形式'), ev('cue', 'CUE-039', '平台是媒介'), ev('cue', 'CUE-040', '核心表达跨诗词书籍影视共通')], 'high', []),
  unit('KU-17', '结尾对开场命题的强化', 'core', '作者最后声称，当创作者能做出共情用户的作品时，爆款和数据只是顺其自然；随后自报“雷子酱编导”并告别。这把开场的共同情感记忆命题强化成创作结果主张，而不是新增证据。', 'author_claim', 136.497, 144.767, [ev('cue', 'CUE-041', '共情用户条件'), ev('cue', 'CUE-042', '爆款数据顺其自然与署名告别')], 'high', ['视频未建立“共情作品→爆款数据”的充分条件']),
  unit('KU-18', '视频没有建立的方法与证明边界', 'core', '在已检查的0—144.767秒完整时间轴、2.5秒初始密集帧、全部cue/shot代表帧和协议5秒复核帧中，没有观察到可执行的选题/脚本步骤、适用条件、失败反例、对照样本、外部来源链接或对强因果主张的验证；因此视频提供的是一种创作观和案例解释，不是可复现教程或因果证明。', 'unknown', 0, 144.767, [ev('source', 'DS-01', '协议靶向证据覆盖全时轴与关键短插入'), ev('frame', 'DENSE-0001', '初始密集帧起点'), ev('frame', 'DENSE-0059', '初始密集帧终点')], 'high', ['未观察到不等于这些信息在视频外不存在']),
  unit('KU-19', '非语音音频的已检范围与未知角色', 'supporting', '媒体含AAC立体声音轨；在0—144.767秒以-42dB、0.5秒阈值做静音检测未得到静音事件，但该诊断不能判断是否有BGM、音效、插入源音频及其叙事作用，故非语音音频角色保持未知。', 'unknown', 0, 144.767, [ev('source', 'DS-03', '全时轴音频流与静音诊断记录')], 'high', ['BGM、音效、插入源音频的存在与意义均未可靠识别']),
  unit('KU-20', '面罩人物、水印与口播署名关系未知', 'supporting', '画面中的面罩人物似乎在进行口播，水印持续为“人类最强编导”，结尾口播自报“雷子酱编导”；视频内部没有说明这三者是否为同一人、账号名与姓名的对应关系，也没有建立蜘蛛侠式造型授权。', 'unknown', 0, 144.767, [ev('targeted_frame', 'TARGET-0074', '开场人物与水印'), ev('targeted_frame', 'TARGET-0079', '结尾人物与水印'), ev('cue', 'CUE-042', '口播自报雷子酱编导')], 'high', []),
  unit('KU-21', '“篇文/骈文”的载体冲突', 'supporting', 'SRT在CUE-013写作“即使是千古第一篇文”，烧录字幕明确显示“即使是千古第一骈文”；后者在画面上可直接读取，但逐字字幕层不作静默修正。', 'visual_observation', 42.84, 44.346, [ev('cue', 'CUE-013', 'SRT原文“篇文”'), ev('targeted_frame', 'TARGET-0057', '烧录字幕“千古第一骈文”'), ev('ocr', 'OCR-00466', 'OCR提出并人工确认“即使是千古第一骈文”')], 'high', []),
  unit('KU-22', '“时机/时期”的载体冲突', 'supporting', 'SRT在CUE-015写作“今年大火的奥德赛时机”，烧录字幕显示“今年大火的奥德赛时期”；逐字层仍保留SRT的“时机”。', 'visual_observation', 47.525, 51.04, [ev('cue', 'CUE-015', 'SRT原文“奥德赛时机”'), ev('targeted_frame', 'TARGET-0060', '烧录字幕“奥德赛时期”'), ev('ocr', 'OCR-00475', 'OCR提出并人工确认“今年大火的奥德赛时期”')], 'high', []),
  unit('KU-23', '“利拉/莉拉”的载体冲突', 'supporting', 'SRT在CUE-020把姿势写作“利拉坐”，而插入页搜索词、标签和叠字以“莉拉”呈现，其中叠字明确为“莉拉坐”；重建将两种载体形式同时保留。', 'visual_observation', 68.682, 71.65, [ev('cue', 'CUE-020', 'SRT原文“利拉坐”'), ev('targeted_frame', 'TARGET-0044', '页面与叠字'), ev('ocr', 'OCR-00275', 'OCR提出并人工确认“莉拉坐”')], 'high', []),
  unit('KU-24', '“民族回忆”是屏幕与SRT一致的作者措辞', 'supporting', 'CUE-031的SRT写作“民族回忆”，对应烧录字幕也显示“但是对于民族回忆的刻骨铭心”；虽然作者随后用“民族情感记忆”归纳，本重建不把前一句静默改成“民族记忆”。', 'visual_observation', 106.28, 109.504, [ev('cue', 'CUE-031', 'SRT“民族回忆”'), ev('targeted_frame', 'TARGET-0067', '烧录字幕“民族回忆”'), ev('ocr', 'OCR-00496', 'OCR提出并人工确认“但是对于民族回忆的刻骨铭心”')], 'high', []),
  unit('KU-25', '技术分段不等于十个语义场景', 'supporting', '证据包给出10个技术shot；逐边界观察显示三组短平台页插入分别位于约22.967—24秒、68.767—69.633秒和101.267—103.233秒，其余边界前后大多仍是相同室内构图中的面罩讲述者。故shot只能作为观察分段，不能证明十个语义场景或完整无剪辑连续性。', 'visual_observation', 0, 144.767, [ev('shot', 'SHOT-001', '首个长口播技术段'), ev('shot', 'SHOT-002', '第一插入页技术段'), ev('shot', 'SHOT-006', '第二插入页技术段'), ev('shot', 'SHOT-008', '第三插入页技术段'), ev('shot', 'SHOT-010', '结尾长口播技术段'), ev('targeted_frame', 'TARGET-0090', '边界复核中的平台页'), ev('targeted_frame', 'TARGET-0092', '边界复核中的同一讲述设置')], 'high', ['shot边界之外是否存在隐藏剪辑未知'])
];

const relations = [
  { from: 'KU-02', to: 'KU-07', relation: 'claim_illustrated_by', evidence: [ev('cue', 'CUE-005', '中心命题'), ev('cue', 'CUE-018', '第一案例归纳')] },
  { from: 'KU-02', to: 'KU-10', relation: 'claim_illustrated_by', evidence: [ev('cue', 'CUE-005', '中心命题'), ev('cue', 'CUE-028', '第二案例归纳')] },
  { from: 'KU-02', to: 'KU-13', relation: 'claim_illustrated_by', evidence: [ev('cue', 'CUE-005', '中心命题'), ev('cue', 'CUE-032', '第三案例归纳')] },
  { from: 'KU-04', to: 'KU-07', relation: 'visible_example_for_but_does_not_prove_scope', evidence: [ev('targeted_frame', 'TARGET-0034', '有限搜索结果页'), ev('cue', 'CUE-018', '必然爆款主张')] },
  { from: 'KU-04', to: 'KU-26', relation: 'visible_search_page_does_not_establish_aggregate_metric_scope', evidence: [ev('targeted_frame', 'TARGET-0034', '搜索页没有聚合80亿计数'), ev('cue', 'CUE-006', '80亿为作者口播主张')] },
  { from: 'KU-08', to: 'KU-10', relation: 'visible_example_for_but_does_not_prove_scale', evidence: [ev('targeted_frame', 'TARGET-0044', '有限搜索结果页'), ev('cue', 'CUE-025', '数以万计主张')] },
  { from: 'KU-08', to: 'KU-27', relation: 'visible_examples_do_not_establish_participant_platform_or_date_scope', evidence: [ev('targeted_frame', 'TARGET-0044', '页面只显示少量示例'), ev('cue', 'CUE-025', '数以万计主张')] },
  { from: 'KU-28', to: 'KU-08', relation: 'cue_028_image_bgm_refers_to_lila_example_artifact', evidence: [ev('targeted_frame', 'TARGET-0044', '莉拉毕业照示例内容'), ev('cue', 'CUE-028', '一张图片一段BGM的回指句')] },
  { from: 'KU-28', to: 'KU-19', relation: 'example_bgm_referent_is_distinct_from_unresolved_source_audio_channel', evidence: [ev('cue', 'CUE-028', 'CUE-028语境指向莉拉示例内容'), ev('source', 'DS-03', '本视频非语音音频仅完成通道诊断、语义未知')] },
  { from: 'KU-12', to: 'KU-13', relation: 'visible_example_for_but_does_not_prove_universality', evidence: [ev('targeted_frame', 'TARGET-0051', '单一作品页'), ev('cue', 'CUE-032', '跨身份普遍性主张')] },
  { from: 'KU-12', to: 'KU-29', relation: 'visible_account_label_does_not_establish_creator_work_or_source_attribution', evidence: [ev('targeted_frame', 'TARGET-0051', '页面可见账号标签'), ev('cue', 'CUE-029', '口播仅称画画作品')] },
  { from: 'KU-07', to: 'KU-15', relation: 'example_generalized_into', evidence: [ev('cue', 'CUE-018', '第一案例结论'), ev('cue', 'CUE-037', '艺术表达归纳')] },
  { from: 'KU-10', to: 'KU-15', relation: 'example_generalized_into', evidence: [ev('cue', 'CUE-028', '第二案例结论'), ev('cue', 'CUE-037', '艺术表达归纳')] },
  { from: 'KU-13', to: 'KU-15', relation: 'example_generalized_into', evidence: [ev('cue', 'CUE-032', '第三案例结论'), ev('cue', 'CUE-037', '艺术表达归纳')] },
  { from: 'KU-02', to: 'KU-17', relation: 'opening_claim_strengthened_by_closing', evidence: [ev('cue', 'CUE-003', '开场共同情感记忆'), ev('cue', 'CUE-042', '结尾爆款数据顺其自然')] },
  { from: 'KU-01', to: 'KU-20', relation: 'visible_referents_whose_identity_mapping_is_unknown', evidence: [ev('targeted_frame', 'TARGET-0001', '面罩与水印'), ev('cue', 'CUE-042', '不同口播署名')] },
  { from: 'KU-25', to: 'KU-01', relation: 'technical_segments_preserve_mostly_same_visible_setting', evidence: [ev('shot', 'SHOT-001', '开头设置'), ev('shot', 'SHOT-010', '结尾设置')] }
];

const cueUnitMap = {
  'CUE-001': ['KU-03'], 'CUE-002': ['KU-02'], 'CUE-003': ['KU-02'], 'CUE-004': ['KU-03'], 'CUE-005': ['KU-02', 'KU-03'],
  'CUE-006': ['KU-04', 'KU-05', 'KU-26'], 'CUE-007': ['KU-05'], 'CUE-008': ['KU-05'], 'CUE-009': ['KU-05'],
  'CUE-010': ['KU-06'], 'CUE-011': ['KU-06'], 'CUE-012': ['KU-06'], 'CUE-013': ['KU-21'], 'CUE-014': ['KU-06'], 'CUE-015': ['KU-06', 'KU-22'],
  'CUE-016': ['KU-07'], 'CUE-017': ['KU-07'], 'CUE-018': ['KU-07'],
  'CUE-019': ['KU-08'], 'CUE-020': ['KU-08', 'KU-23'], 'CUE-021': ['KU-09'], 'CUE-022': ['KU-09'], 'CUE-023': ['KU-09'], 'CUE-024': ['KU-09'],
  'CUE-025': ['KU-10', 'KU-27'], 'CUE-026': ['KU-10', 'KU-11'], 'CUE-027': ['KU-10'], 'CUE-028': ['KU-10', 'KU-28'],
  'CUE-029': ['KU-12', 'KU-29'], 'CUE-030': ['KU-13', 'KU-14'], 'CUE-031': ['KU-13', 'KU-24'], 'CUE-032': ['KU-13'],
  'CUE-033': ['KU-15'], 'CUE-034': ['KU-15'], 'CUE-035': ['KU-15'], 'CUE-036': ['KU-15'], 'CUE-037': ['KU-15'],
  'CUE-038': ['KU-16'], 'CUE-039': ['KU-16'], 'CUE-040': ['KU-16'], 'CUE-041': ['KU-17'], 'CUE-042': ['KU-17', 'KU-20']
};

const transcript = {
  origin: evidence.transcript.origin,
  cues: evidence.transcript.cues.map(c => ({ id: c.id, start: c.start, end: c.end, text: c.text, representativeFrame: c.representativeFrame, overlappingShots: c.overlappingShots }))
};
const cueAccountability = transcript.cues.map(c => ({
  cueId: c.id,
  disposition: 'knowledge',
  unitIds: cueUnitMap[c.id],
  rationale: `该cue已保留并链接到${cueUnitMap[c.id].join('、')}；若存在载体冲突，另有独立冲突单元。`
}));

const reconstruction = {
  schemaVersion: 'video-reconstruction-1.0',
  evidencePack: '../evidence/evidence-pack.json',
  probe: 'probe.json',
  protocol: 'capture-protocol.json',
  scopeStatement: '仅重建本地视频与提供字幕中可观察、可归因的内容；平台截图、历史/作品信息、身份、授权、统计规模和因果主张均未联网核验。三处平台页作为视频内部的插入例证，与作者口播主张分开；80亿的统计口径、莉拉趋势规模、绘画作者/作品/来源归属均保持未知。CUE-028的一张图片一段BGM只在上下文中绑定莉拉示例内容，不自动等同本视频音轨；确切素材仍未知。负面结论仅限已检查的0—144.767秒时间轴。',
  viewerChange: {
    before: '观众可能把爆款主要归因于钩子、网感、梗或标题技巧。',
    after: '视频意图让观众把共同情感记忆与有生命感的核心表达视为更根本的创作因素，同时把短视频和平台降为形式与媒介。',
    intendedChanges: ['理解作者的共情优先命题', '通过三个案例区分人生迷茫、性别处境与民族记忆', '识别该视频是观点论证而非已验证教程']
  },
  derivedSources: [
    { id: 'DS-01', path: 'targeted-evidence/targeted-evidence.json', kind: 'protocol_targeted_frames', producedBy: 'capture-protocol-evidence.mjs using capture-protocol.json', timeRange: { start: 0, end: 144.767 }, limitations: ['帧序列不能证明无隐藏剪辑', '抽样帧不能替代完整音频语义识别'] },
    { id: 'DS-02', path: 'targeted-evidence/ocr-evidence.json', kind: 'macos_vision_ocr_proposals', producedBy: 'ocr-frames.swift; accepted rows manually checked against source frames', timeRange: { start: 0, end: 144.767 }, limitations: ['OCR为提案而非真值', '低置信度小字只在人工可辨时采用', '平台页边缘文字和歌手标签仍有不确定字符'] },
    { id: 'DS-03', path: 'audio-inspection.txt', kind: 'audio_stream_and_silence_diagnostic', producedBy: 'ffmpeg silencedetect n=-42dB d=0.5', timeRange: { start: 0, end: 144.767 }, limitations: ['只能判断阈值内静音事件', '不能识别音乐、音效或叙事作用'] }
  ],
  transcript,
  knowledgeUnits,
  relations,
  coverageMatrix: {
    channels: [
      { id: 'CAR-01', available: true, inspected: true }, { id: 'CAR-02', available: true, inspected: true },
      { id: 'CAR-03', available: true, inspected: true }, { id: 'CAR-04', available: true, inspected: true },
      { id: 'CAR-05', available: true, inspected: true }, { id: 'CAR-06', available: true, inspected: true },
      { id: 'CAR-07', available: true, inspected: true }, { id: 'CAR-08', available: true, inspected: true }
    ],
    meaningChanges: [
      { id: 'MC-01', captured: true, unitIds: ['KU-02', 'KU-03'] }, { id: 'MC-02', captured: true, unitIds: ['KU-04', 'KU-05', 'KU-26'] },
      { id: 'MC-03', captured: true, unitIds: ['KU-05', 'KU-06', 'KU-07', 'KU-21', 'KU-22'] }, { id: 'MC-04', captured: true, unitIds: ['KU-08', 'KU-23'] },
      { id: 'MC-05', captured: true, unitIds: ['KU-09', 'KU-10', 'KU-11', 'KU-27', 'KU-28'] }, { id: 'MC-06', captured: true, unitIds: ['KU-12', 'KU-13', 'KU-14', 'KU-24', 'KU-29'] },
      { id: 'MC-07', captured: true, unitIds: ['KU-15', 'KU-16'] }, { id: 'MC-08', captured: true, unitIds: ['KU-17', 'KU-20'] }
    ],
    relationships: [
      { id: 'REL-01', evidenced: true, evidenceRefs: ['CUE-005', 'CUE-018'] }, { id: 'REL-02', evidenced: true, evidenceRefs: ['CUE-005', 'CUE-028'] },
      { id: 'REL-03', evidenced: true, evidenceRefs: ['CUE-005', 'CUE-032'] }, { id: 'REL-04', evidenced: true, evidenceRefs: ['CUE-018', 'CUE-037'] },
      { id: 'REL-05', evidenced: true, evidenceRefs: ['CUE-028', 'CUE-037'] }, { id: 'REL-06', evidenced: true, evidenceRefs: ['CUE-032', 'CUE-037'] },
      { id: 'REL-07', evidenced: true, evidenceRefs: ['CUE-003', 'CUE-042'] }, { id: 'REL-08', evidenced: true, evidenceRefs: ['TARGET-0001', 'CUE-042'] },
      { id: 'REL-09', evidenced: true, evidenceRefs: ['TARGET-0001', 'CUE-042'] }, { id: 'REL-10', evidenced: true, evidenceRefs: ['SHOT-001', 'SHOT-002', 'SHOT-006', 'SHOT-008', 'SHOT-010'] }
    ],
    criticalQuestions: [
      { id: 'CQ-01', status: 'answered', unitIds: ['KU-02'], evidenceRefs: ['CUE-002', 'CUE-003', 'CUE-005'] },
      { id: 'CQ-02', status: 'answered', unitIds: ['KU-07', 'KU-10', 'KU-13', 'KU-28'], evidenceRefs: ['CUE-016', 'CUE-028', 'CUE-032', 'TARGET-0044'] },
      { id: 'CQ-03', status: 'answered', unitIds: ['KU-04', 'KU-08', 'KU-12', 'KU-26', 'KU-27', 'KU-29'], evidenceRefs: ['TARGET-0034', 'TARGET-0044', 'TARGET-0051', 'CUE-006', 'CUE-025', 'CUE-029'] },
      { id: 'CQ-04', status: 'answered', unitIds: ['KU-11', 'KU-14', 'KU-21', 'KU-22', 'KU-23', 'KU-24'], evidenceRefs: ['OCR-00466', 'OCR-00475', 'OCR-00487', 'OCR-00493', 'OCR-00275', 'OCR-00496'] },
      { id: 'CQ-05', status: 'answered', unitIds: ['KU-15', 'KU-16', 'KU-17'], evidenceRefs: ['CUE-033', 'CUE-036', 'CUE-040', 'CUE-042'] },
      { id: 'CQ-06', status: 'unknown', unitIds: ['KU-18', 'KU-26', 'KU-27', 'KU-28', 'KU-29'], evidenceRefs: ['DS-01', 'DENSE-0001', 'DENSE-0059', 'CUE-006', 'CUE-025', 'CUE-028', 'CUE-029'] },
      { id: 'CQ-07', status: 'unknown', unitIds: ['KU-20'], evidenceRefs: ['TARGET-0001', 'CUE-042'] },
      { id: 'CQ-08', status: 'unknown', unitIds: ['KU-19', 'KU-25'], evidenceRefs: ['DS-03', 'SHOT-001', 'SHOT-010'] }
    ],
    cueAccountability,
    coreEvidence: { covered: knowledgeUnits.filter(u => u.importance === 'core' && u.evidence.length > 0).length, total: knowledgeUnits.filter(u => u.importance === 'core').length },
    unknowns: ['“80亿”的数据来源、平台范围、日期窗口与指标定义未知', '莉拉趋势的去重参与规模、平台覆盖与日期窗口未知', 'CUE-028指向莉拉示例内容，但确切图片、BGM、版本、来源与授权未知；不自动等同本视频音轨', '绘画页可见账号为@莫那手绘，但原创者、确切作品身份、原始来源上下文与授权未知', '强因果、普遍范围与历史/作品事实未外部验证', '非语音音频语义角色未知', '人物、水印账号与口播署名关系未知', '页面截图真实性与指标采集时点未知', '隐藏剪辑未知', '可执行步骤、失败反例与适用边界未在全片观察到'],
    uncheckedChannels: []
  },
  metaGate: {
    question: '原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',
    pass: true,
    uncheckedChannels: [],
    overlookedMeaningChanges: [],
    overlookedRelationships: [],
    rationale: '逐字字幕、烧录字幕、人物/手势/环境、水印与平台UI、三处短插入、剪辑与技术边界、非语音音频和决策相关缺失项均已在完整时间轴或明确窗口内检查；8个意义变化、10个探针关系假设和42条cue均已闭合。CUE-028的“一张图片一段BGM”已显式绑定到莉拉示例内容，并与本视频自身非语音音频通道分离；确切图片/BGM仍保留未知。80亿统计口径、莉拉趋势范围、绘画作者/作品/来源归属、非语音音频语义、身份对应、外部真实性和因果充分性均被明确保留为未知，不属于未检查渠道。'
  }
};

fs.writeFileSync(path.join(runDir, 'reconstruction.json'), `${JSON.stringify(reconstruction, null, 2)}\n`);
