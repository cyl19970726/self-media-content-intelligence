import fs from 'node:fs';
import path from 'node:path';

const runDir = path.dirname(new URL(import.meta.url).pathname);
const evidencePath = path.resolve(runDir, '../evidence/evidence-pack.json');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const cue = (id, supports) => ({refType: 'cue', ref: id, supports});
const frame = (id, supports) => ({refType: 'targeted_frame', ref: id, supports});
const ocr = (id, supports) => ({refType: 'ocr', ref: id, supports});
const shot = (id, supports) => ({refType: 'shot', ref: id, supports});
const evidenceFrame = (id, supports) => ({refType: 'frame', ref: id, supports});
const unit = (id, title, importance, statement, provenance, start, end, evidenceRefs, confidence, unknowns = [], extra = {}) => ({
  id, title, importance, statement, provenance, timeRange: {start, end}, evidence: evidenceRefs, confidence, unknowns, ...extra
});

const knowledgeUnits = [
  unit('KU-00', '开场社交数据社会证明', 'core', '0 秒先插入两张社交内容/数据面板式截图。画面可辨认 832.7万、611.9万、978.0万浏览，以及 10万+、3.7万、3080 等互动/计数字样；图标对应关系有部分难辨。该插入在方法讲解前构成社会证明，但画面没有建立这些数字对应的账号、帖子、统计窗口，也没有把它们与本方法效果或购买转化建立因果联系。', 'visual_observation', 0, 1, [evidenceFrame('DENSE-0001', '0 秒完整数据插入与双截图布局'), frame('TARGET-0108', '协议定点复核 0 秒数据插入'), ocr('OCR-00784', 'OCR 高置信读取 832.7万'), ocr('OCR-00785', 'OCR 提议读取 611.9万')], 'high', ['978.0万浏览及较小互动数字虽目视可见，但部分图标/对应关系不够清晰；账号、帖子、统计窗口、数据真实性、方法归因和购买转化均未知。']),
  unit('KU-OPEN', '跨行业做 IP 的开场前提', 'supporting', '作者以“这两年不同行业的人都在下场做 IP”作为开场趋势判断，并据此转入从人性角度讲故事的方法。', 'author_claim', 0, 5.65, [cue('CUE-001', '完整开场趋势判断'), ocr('OCR-00012', '烧录字幕支持不同行业的人都在下场做 IP')], 'high', ['视频没有给出行业范围、样本或趋势数据。']),
  unit('KU-01', '问题与适用边界', 'core', '视频要回答“创始人 IP 故事应该怎么讲”，并明确说非创始人 IP 也可以使用这套方法。', 'author_claim', 5.66, 10.646, [cue('CUE-002', '提出核心问题'), cue('CUE-003', '扩展适用边界'), ocr('OCR-00021', '烧录字幕明确“不是创始人IP也可使用”')], 'high', ['作者没有说明非创始人应如何改写创始人经历、品牌字段、例子或步骤。']),
  unit('KU-02', '三个底层判断', 'core', '作者提出三条底层判断：内容的本质是人性；自媒体的本质在烧录字幕中写作“ta媒体”（提供的 SRT 写作“他媒体”）；做视频的本质是做产品。', 'author_claim', 8.984, 15.25, [cue('CUE-004', '预告三个底层逻辑'), cue('CUE-005', 'SRT 原始表述'), frame('TARGET-0006', '画面中两行烧录字幕'), ocr('OCR-00032', 'OCR 提议支持“ta媒体”画面形式')], 'high', ['“ta媒体”的确切概念与发音不能仅由现有载体确定。']),
  unit('KU-03', 'IP 的认知与情感升级', 'core', '作者把做 IP 描述为两组状态升级：从喜欢到爱上，从认识到信任。', 'author_claim', 15.26, 17.94, [cue('CUE-006', '给出两组升级'), ocr('OCR-00036', '烧录字幕支持前一组')], 'high'),
  unit('KU-04', '降低决策成本的商业主张', 'core', '作者主张，IP 能大幅降低用户决策成本，并使用户因为个人 IP 故事或品牌故事而购买产品。', 'author_claim', 17.94, 25.64, [cue('CUE-007', '提出为何做 IP'), cue('CUE-008', '降低决策成本主张'), cue('CUE-009', '购买主张'), ocr('OCR-00050', '烧录字幕支持决策成本表述')], 'high', ['开场虽有社交互动/浏览数据截图，但视频没有把其与该主张、购买转化或因果效果相连，也没有对照。'], {argument: {claim: 'IP 能降低用户决策成本并促成基于个人/品牌故事的购买。', evidenceUnitIds: ['KU-00','KU-05'], conditions: ['受众先认识并信任该个人或品牌。'], counterexamples: [], actions: ['通过个人故事或品牌故事塑造熟悉与信任。'], limits: ['开场数据卡只形成社会证明，不能证明该方法造成这些数字或购买转化。']}}),
  unit('KU-05', '小米 SU7/雷军例子', 'supporting', '作者用“很多人购买熟悉品牌造车的小米 SU7，是因为雷军有魅力”来说明前述主张；这是作者给出的解释，不是视频内被独立证明的购买动机。', 'author_claim', 25.64, 29.44, [cue('CUE-010', '完整例子'), ocr('OCR-00070', '烧录字幕显示“因为雷军有魅力”')], 'high', ['真实购买动机与贡献比例未知。']),
  unit('KU-06', '双向总法则', 'core', '个人和品牌两部分共用“只要你要，只要我有”：先识别受众想要的人性需求或消费心理，再把个人拥有的经历与价值、或品牌拥有的特性、文化和口号对齐这些需求。', 'system_inference', 29.45, 123.283, [cue('CUE-011', '提出个人和品牌共用法则'), cue('CUE-012', '个人部分进入“只要你要”'), cue('CUE-016', '个人部分进入“只要我有”'), cue('CUE-032', '品牌部分重新解释“只要你要”'), cue('CUE-038', '品牌部分进入“只要我有”'), ocr('OCR-00082', '烧录字幕并列显示双向法则')], 'high', [], {reasoning: '相同的两步法在个人与品牌两部分各重复一次，形成需求侧→供给侧的平行结构。'}),
  unit('KU-07', '个人需求侧的六类选题', 'core', '作者明确提出六个主题：年少有为、大器晚成、造梦狂人、草根逆袭、逆风翻盘、苟富贵勿相忘，并称它们是“六个必火选题”和“中国人一生追求的六件事”。', 'author_claim', 34.7, 48.27, [cue('CUE-013', '六个主题框架与首项'), cue('CUE-014', '第二、三主题'), cue('CUE-015', '后三主题'), frame('TARGET-0017', '黄色大字显示中国人一生追求的六件事')], 'high', ['“必火”与“中国人一生追求”的普遍范围未被视频证明。']),
  unit('KU-07A', '六主题的人物映射与窄化冲突', 'supporting', '可恢复的人物映射为：年少有为—雷军；大器晚成—宗庆后；造梦狂人—马斯克；逆风翻盘—罗永浩；苟富贵勿相忘—于东来。草根逆袭段相邻载体同时出现刘强东和曹德旺，且后续又出现“刘强东”，因此不确定性应仅保留在刘强东/曹德旺的标点与分组边界，不扩展到罗永浩或于东来。', 'visual_observation', 37.358, 51.495, [cue('CUE-013', '年少有为与雷军'), cue('CUE-014', '宗庆后与马斯克'), cue('CUE-015', '刘强东/曹德旺、罗永浩、于东来连续串'), cue('CUE-016', '跨边界再次出现刘强东'), frame('TARGET-0018', '年少有为—雷军同帧'), frame('TARGET-0019', '大器晚成—宗庆后同帧'), frame('TARGET-0020', '草根逆袭段的刘强东/曹德旺邻接'), frame('TARGET-0021', '逆风翻盘—罗永浩同帧'), frame('TARGET-0022', '苟富贵勿相忘—于东来段同帧')], 'medium', ['草根逆袭应只对应刘强东、只对应曹德旺或同时以两人为例，现有标点/分组不能完全确定。']),
  unit('KU-08', '个人供给侧素材', 'core', '作者要求从利他性出发，用自己拥有的材料对齐用户需求：成就以及 how/when 做到；最大挫折；正确选择；一句话总结成功；给年轻人的一句忠告。', 'author_claim', 48.27, 64.98, [cue('CUE-016', '进入只要我有与利他性'), cue('CUE-017', '对齐用户需求'), cue('CUE-018', '成就和 how/when'), cue('CUE-019', '挫折和选择'), cue('CUE-020', '一句话总结'), cue('CUE-021', '忠告与大纲'), ocr('OCR-00140', '烧录字幕标示第二步'), ocr('OCR-00146', '烧录字幕支持 how/when')], 'high'),
  unit('KU-09', '个人故事大纲', 'core', '作者用“1+2=3”概括故事大纲：先说取得的成果；再说开始、困难、转折与上升；并加入亲情、爱情、义气，让视频有温度。', 'author_claim', 64.989, 74.56, [cue('CUE-022', '1+2=3 与成果'), cue('CUE-023', '开始、困难、转折、上升'), cue('CUE-024', '亲情爱情义气与温度'), ocr('OCR-00167', '烧录字幕显示 1+2=3'), ocr('OCR-00172', '烧录字幕显示困难'), ocr('OCR-00179', '烧录字幕显示亲情爱情义气')], 'high', ['画面没有给出一个从头到尾完成的成片案例。'], {procedural: {input: '受众想要的六类人生主题与个人可供给的经历/价值材料。', actions: ['先呈现已取得的成果。', '交代开始状态。', '讲遇到的困难。', '讲转折。', '讲上升。', '加入亲情、爱情或义气等情感关系。'], parameters: ['作者口述结构“1+2=3”'], output: '一个兼具结果、过程与情感温度的个人 IP 故事大纲。', beforeFrames: ['TARGET-0023'], duringFrames: ['TARGET-0025', 'TARGET-0026', 'TARGET-0027', 'TARGET-0029', 'TARGET-0030'], afterFrames: ['TARGET-0031', 'TARGET-0032'], unknowns: ['视频未展示把该大纲制作成完整成片的过程或效果。']}}),
  unit('KU-10', '从个人转入品牌', 'core', '作者说品牌与创始人息息相关，并把同一个“只要你要、只要我有”结构平行应用到品牌故事。', 'author_claim', 74.56, 81.39, [cue('CUE-025', '从个人转到品牌'), cue('CUE-026', '品牌与创始人关系'), ocr('OCR-00188', '烧录字幕确认转入品牌')], 'high'),
  unit('KU-11', '品牌需求侧的五个产品心理特性', 'core', '画面顶部大字明确列出“用户心理看产品特性：新、强、稳、故事、平”，讲者称其为五个板块。可靠可辨的举例包括：新—APP、3C、快销；强—汽车、工业、芯片、ToB；故事—文创、奢品；平—可理解为平价和亲民，例为快消品和日用。SRT 对“稳”段写作“家居代销食品和医美”，画面只清楚支持其中“食品”和字幕缩写“ym”，其余小词不能可靠确认。', 'visual_observation', 81.4, 99.8, [cue('CUE-027', '产品需要有特性'), cue('CUE-028', 'SRT 的新类例子'), cue('CUE-029', 'SRT 的强/稳段原文'), cue('CUE-030', 'SRT 写作文创和 shopping'), cue('CUE-031', '平的解释与例子'), frame('TARGET-0036', '顶部五词大字与五个板块字幕'), frame('TARGET-0037', '新类例子'), frame('TARGET-0038', '第二是强'), frame('TARGET-0040', '第三是稳'), frame('TARGET-0041', '故事类烧录字幕写“文创和奢品”'), frame('TARGET-0042', '平的解释'), ocr('OCR-00207', 'OCR 支持顶部标题'), ocr('OCR-00208', 'OCR 支持五词'), ocr('OCR-00220', 'OCR 支持五个板块'), ocr('OCR-00279', 'OCR 提议支持文创和奢品')], 'medium', ['“稳”类的全部例子不清；五类是否互斥、如何处理重叠产品未说明。']),
  unit('KU-12', '产品分类的载体冲突', 'supporting', '提供的 SRT 在 83.6—99.8 秒出现“一个板块”“压力强”“第三是碗”“shopping”等形式；烧录字幕/大字分别支持“五个板块”“第二是强”“第三是稳”“文创和奢品”“平价和亲民”。重建采用画面支持的分类骨架，同时完整保留 SRT 原文，不补全仍不可辨的小字。', 'visual_observation', 83.6, 99.8, [cue('CUE-028', 'SRT 原始冲突形式'), cue('CUE-029', 'SRT 原始冲突形式'), cue('CUE-030', 'SRT 原始 shopping'), cue('CUE-031', 'SRT 平段'), ocr('OCR-00220', '五个板块'), ocr('OCR-00242', '第二是强'), ocr('OCR-00264', '第三是稳'), ocr('OCR-00279', '文创和奢品'), frame('TARGET-0042', '平价和亲民烧录字幕')], 'high', ['“稳”类白板小字仍不足以安全修正。']),
  unit('KU-12A', '从产品特性到消费者心理/品牌吸引力', 'core', '作者在“只要你要”下把五个产品特性重新解释为消费者心理问题，并连续追问“什么样的品牌会受到用户喜欢”“什么样的品牌是有魅力的品牌”；这个重构是从产品分类进入六个品牌方向的语义桥梁。', 'author_claim', 99.81, 106.617, [cue('CUE-032', '从消费者心理的人性来讲'), cue('CUE-033', '用户喜欢什么品牌'), cue('CUE-034', '什么品牌有魅力'), ocr('OCR-00311', 'OCR 提议支持消费者心理重述'), ocr('OCR-00315', 'OCR 提议支持用户喜欢问题'), ocr('OCR-00323', 'OCR 支持品牌魅力问题')], 'high'),
  unit('KU-13', '六个品牌方向', 'core', '作者说品牌仍有六个方向，并以画面可辨形式列举：行业先锋—字节跳动；匠心沉淀—百达翡丽；改变世界—SpaceX；平民实干—福耀科技；重生突围—交个朋友；温情共生—胖东来和京东。', 'author_claim', 106.617, 115.45, [cue('CUE-035', 'SRT 原始前半列表'), cue('CUE-036', 'SRT 原始后半列表'), frame('TARGET-0047', '烧录字幕称六个方向'), frame('TARGET-0111', '定点帧完整显示行业先锋与字节跳动'), ocr('OCR-00814', 'OCR 支持“行业先锋 字节跳动”'), frame('TARGET-0048', '匠心沉淀—百达翡丽'), frame('TARGET-0049', '改变世界—SpaceX'), frame('TARGET-0050', '重生突围—交个朋友'), frame('TARGET-0051', '温情共生—胖东来和京东'), ocr('OCR-00344', 'OCR 支持匠心映射'), ocr('OCR-00353', 'OCR 提议支持 SpaceX 映射'), ocr('OCR-00374', 'OCR 支持温情共生映射')], 'high', ['“平民实干—福耀科技”仍主要依赖白板/口播组合，文字较小。']),
  unit('KU-14', '品牌方向与创始人个性', 'core', '作者主张这些品牌方向与其创始人的个性息息相关。', 'author_claim', 115.45, 117.53, [cue('CUE-037', '明确关系主张'), ocr('OCR-00402', '烧录字幕支持“息息相关”')], 'high', ['视频未给出反例、比较组或因果证明。']),
  unit('KU-15', '品牌供给侧：文化与 slogan', 'core', '作者主张品牌文化和 slogan 能反映品牌特性，并以连续品牌语句或故事作为“只要我有”的供给材料。', 'author_claim', 117.53, 123.283, [cue('CUE-038', '进入品牌只要我有与文化/slogan'), cue('CUE-039', '反映品牌特性主张'), ocr('OCR-00420', '烧录字幕支持绝对性措辞')], 'high', ['“绝对能反映”是作者的强范围主张，视频没有验证所有品牌。']),
  unit('KU-16', '字节跳动语句例', 'supporting', '作者把“激发创造，丰富生活”归给字节跳动，作为品牌文化/slogan 例子。', 'author_claim', 123.283, 125.521, [cue('CUE-040', '归属与语句'), ocr('OCR-00430', '烧录字幕显示字节跳动')], 'high', ['是否为官方、完整、当前有效的口号未在视频内证明。']),
  unit('KU-17', '百达翡丽语句例', 'supporting', '作者引用“没有人能真正拥有百达翡丽，你只在替下一代保管它”。', 'author_claim', 125.521, 130.789, [cue('CUE-041', '前半句'), cue('CUE-042', '后半句'), ocr('OCR-00434', '烧录字幕支持前半句')], 'high', ['官方原文、翻译和使用边界未在视频内核验。']),
  unit('KU-18', 'SpaceX 语句例与冲突', 'supporting', '烧录字幕把 SpaceX 相关语句显示为“让人类成为多行星物种”；提供的 SRT 写作“让人类成为多形性物种space x”。画面读法更支持“多行星物种”，但其官方准确措辞未验证。', 'visual_observation', 127.101, 130.789, [cue('CUE-042', 'SRT 原始冲突形式'), frame('TARGET-0058', '烧录字幕显示多行星物种'), ocr('OCR-00445', 'OCR 高置信支持画面读法')], 'high', ['未外部验证官方口号。']),
  unit('KU-19', '福耀科技语句例', 'supporting', '烧录字幕显示“为中国人做一片汽车玻璃”，随后点名“福耀科技”；SRT 把“片”转写成“篇”，并把企业名转写为“扶摇科技”。', 'visual_observation', 130.8, 133.3, [cue('CUE-043', 'SRT 原始语句'), cue('CUE-044', 'SRT 原始企业名冲突'), frame('TARGET-0059', '烧录字幕显示“一片汽车玻璃”'), frame('TARGET-0060', '烧录字幕点名福耀科技'), ocr('OCR-00458', 'OCR 提议支持福耀科技')], 'high', ['语句的官方归属与准确版本未验证。']),
  unit('KU-20', '交个朋友故事例', 'supporting', '烧录字幕在点名福耀科技后转入“基本上不赚钱”，随后出现“交个朋友”，再说“其实赚了一堆钱，把债全还完了”；这段把交个朋友的还债故事作为品牌特性材料，但 SRT 的分句和主体错位，故不把“不赚钱”归给福耀科技。', 'visual_observation', 133.3, 135.799, [cue('CUE-044', 'SRT 将主体错位到扶摇科技'), cue('CUE-045', 'SRT 后续混合原文'), frame('TARGET-0061', '烧录字幕显示基本上不赚钱'), frame('TARGET-0063', '烧录字幕点名交个朋友'), frame('TARGET-0064', '烧录字幕显示其实赚了一堆钱'), frame('TARGET-0066', '烧录字幕显示把债全还完了'), ocr('OCR-00464', 'OCR 支持“不赚钱”'), ocr('OCR-00479', 'OCR 支持交个朋友'), ocr('OCR-00482', 'OCR 提议支持赚钱转折')], 'medium', ['“基本上不赚钱”的完整主语和精确逻辑仍可能受剪辑/分句影响。']),
  unit('KU-21', '胖东来与京东例', 'supporting', '作者在结尾列出“爱在胖东来”和“多快好省”，并点名胖东来和京东，作为温情共生方向下的品牌表达例子。', 'author_claim', 135.799, 138.1, [cue('CUE-045', 'SRT 混合列出两句'), cue('CUE-046', '点名胖东来和京东'), frame('TARGET-0067', '烧录字幕显示多快好省'), ocr('OCR-00495', '烧录字幕/OCR 支持两个品牌名')], 'medium', ['“爱在胖东来”的精确画面措辞未被 OCR 稳定识别；官方口号归属未验证。']),
  unit('KU-22', '讲述者与设置', 'context', '全片可见同一名戴红色蜘蛛侠式面具、手持红色 marker 的讲述者，在有白板、洗衣机、晾衣杆和柜体的家庭洗衣区讲解并指向白板。造型相似不证明其真实身份、授权或与任何虚构角色的官方关系。', 'visual_observation', 0, 141.804, [frame('TARGET-0072', '开头设置'), frame('TARGET-0088', '中段设置'), frame('TARGET-0101', '结尾设置'), shot('SHOT-001', '开头技术段'), shot('SHOT-016', '结尾技术段')], 'high', ['讲述者真实身份、面具来源与授权未知。']),
  unit('KU-23', '可见账号抬头与促销限定', 'context', '画面顶部持续可见“小红书”样式标识、账号抬头“人类最强编导”和括号内“5w粉丝三天全线产品打折”字样；它是画面内账号/促销限定，不等于对当前真实账号身份、粉丝数或促销有效性的外部验证。', 'visual_observation', 0, 141.804, [frame('TARGET-0002', '顶部抬头'), ocr('OCR-00013', 'OCR 提议读取账号抬头和限定'), frame('TARGET-0101', '结尾仍可见抬头')], 'medium', ['括号是否完整闭合、促销具体对象和有效期未说明。']),
  unit('KU-24', '技术分段与可见连续性', 'supporting', '证据包给出 16 个技术镜头段；全时间轴密集帧与 7.2—8.65 秒边界序列持续显示同一白板、洗衣机、柜体和讲述者，因此这些切点不能被当作 16 个语义场景。可见设置连续也不能证明没有隐藏剪辑。', 'system_inference', 0, 141.804, [shot('SHOT-001', '第一技术段'), shot('SHOT-016', '最后技术段'), frame('TARGET-0102', '边界前'), frame('TARGET-0103', '7.36 秒边界'), frame('TARGET-0104', '边界后'), frame('TARGET-0106', '8.49 秒边界'), frame('TARGET-0107', '边界后')], 'high', ['隐藏剪辑是否存在未知。'], {reasoning: '跨边界比较稳定背景物与人物，只能支持设置连续，不能支持无剪辑。'}),
  unit('KU-25', '数据证明范围、案例与执行入口的有界边界', 'core', '视频 0 秒确实展示了社交互动/浏览量数据截图；但在 0—141.804 秒字幕、目标帧和密集帧中，未观察到这些数字对应的账号/帖子/统计窗口、与本方法的对应关系、明确购买转化指标或因果对照，也未观察到完整成片案例、模板下载、明确 CTA、价格、平台/账号/区域要求或支持责任主体。因此可说视频用数据卡做社会证明，不能说它证明了该方法效果或购买转化。', 'visual_observation', 0, 141.804, [evidenceFrame('DENSE-0001', '开场确有社交互动/浏览数据'), frame('TARGET-0108', '协议定点复核数据卡'), cue('CUE-001', '方法讲解开始范围'), cue('CUE-046', '结尾范围'), frame('TARGET-0086', '70 秒中段'), frame('TARGET-0101', '141.647 秒结尾')], 'medium', ['数据卡来源、对象、统计窗口与方法归因未知；每 5 秒采样可能漏掉样本间极短视觉元素。']),
  unit('KU-26', '非语音音频：持续音乐型底层及工具边界', 'supporting', '对 0—141.806 秒音轨执行 10 秒窗、5 秒步长的本地 AudioSet AST 分类：29/29 窗检出 speech-like 与 music-like 类别，0/29 窗检出独立 sfx-like 类别。该结果支持“口播下持续有音乐型底层”的系统推断；音乐在末段仍被检出但分数下降。当前运行时明确不支持模型直接试听返回音频，因此曲风、来源、版权、音量关系、具体情绪/强调功能以及低电平短音效是否漏检仍未知。', 'system_inference', 0, 141.804, [{refType: 'source', ref: 'SRC-AUDIO-CLASSIFY', supports: '完整时间轴 29 个重叠音频窗的 speech/music/SFX 类别结果与工具边界'}], 'medium', ['精确曲风、曲目/版权来源、音乐是否在个别瞬间停顿、具体情绪或强调作用、以及分类器未检出的低电平短音效未知。'], {reasoning: '所有重叠窗的高排名标签均同时含 Speech 和 Music，且没有 sfx-like 高排名标签；这足以登记音乐型底层，但分类不能替代人工语义试听。'}),
  unit('KU-27', '结尾功能与身份冲突闭合', 'supporting', '最终 cue 先收束胖东来和京东例子，再以账号/讲述者标签“人类最强编导”签名并说“我们下期再见”。SRT 的“我是人类最上边的”是与结尾画面顶部持续可见账号抬头冲突的转写错误；同一结尾窗口内的较强可见/烧录载体支持“人类最强编导”。结尾没有重述开头的方法问题或给出执行 CTA。真实世界中的人物身份、资历和账号所有权仍未知。', 'visual_observation', 138.01, 141.804, [cue('CUE-046', '保留最终 SRT 冲突原文'), frame('TARGET-0068', '138.1 秒最终品牌例子与顶部账号抬头'), frame('TARGET-0070', '141 秒告别段与顶部账号抬头'), ocr('OCR-00537', '141 秒烧录字幕支持下期再见'), frame('TARGET-0101', '141.647 秒结尾持续可见人类最强编导抬头')], 'high', ['讲述者真实身份、专业资历、账号所有权和自称真实性未知。'])
];

const relations = [
  {from: 'KU-00', to: 'KU-01', relation: 'credibility_setup_for', evidence: [evidenceFrame('DENSE-0001', '先展示社交数据卡'), cue('CUE-002', '随后提出方法问题')]},
  {from: 'KU-01', to: 'KU-02', relation: 'goal_depends_on_foundation', evidence: [cue('CUE-002', '先提出故事怎么讲'), cue('CUE-004', '随后承诺三个底层逻辑'), cue('CUE-005', '展开三逻辑')]},
  {from: 'KU-02', to: 'KU-03', relation: 'foundation_frames_relationship_conversion', evidence: [cue('CUE-005', '以人性/他者/产品作为基础'), cue('CUE-006', '紧接认识到信任与喜欢到爱上') ]},
  {from: 'KU-02', to: 'KU-04', relation: 'frames', evidence: [cue('CUE-005', '先给底层判断'), cue('CUE-008', '后给 IP 价值主张')]},
  {from: 'KU-04', to: 'KU-05', relation: 'claim_illustrated_by', evidence: [cue('CUE-008', '主张'), cue('CUE-010', '例子')]},
  {from: 'KU-06', to: 'KU-08', relation: 'demand_then_supply_pair', evidence: [cue('CUE-012', '先解释只要你要'), cue('CUE-016', '后进入只要我有')]},
  {from: 'KU-07', to: 'KU-08', relation: 'demand_aligned_with_supply', evidence: [cue('CUE-013', '需求主题'), cue('CUE-017', '供给对齐需求')]},
  {from: 'KU-07', to: 'KU-07A', relation: 'topic_to_person_mapping', evidence: [cue('CUE-013', '主题与首个人物'), cue('CUE-014', '中段人物'), cue('CUE-015', '后半映射'), frame('TARGET-0021', '逆风翻盘与罗永浩同帧'), frame('TARGET-0022', '苟富贵勿相忘与于东来同帧')]},
  {from: 'KU-08', to: 'KU-09', relation: 'organized_into', evidence: [cue('CUE-021', '素材转为大纲'), cue('CUE-022', '1+2=3')]},
  {from: 'KU-09', to: 'KU-10', relation: 'precedes_brand_parallel', evidence: [cue('CUE-024', '个人部分收束'), cue('CUE-025', '转入品牌')]},
  {from: 'KU-06', to: 'KU-15', relation: 'parallel_application_of_same_rule', evidence: [cue('CUE-011', '总法则用于个人和品牌'), cue('CUE-038', '品牌第二步仍是只要我有')]},
  {from: 'KU-11', to: 'KU-13', relation: 'maps_to', evidence: [cue('CUE-032', '消费者心理的人性'), cue('CUE-035', '进入方向列表')]},
  {from: 'KU-11', to: 'KU-12A', relation: 'taxonomy_reframed_as_consumer_psychology', evidence: [cue('CUE-031', '五分类收束'), cue('CUE-032', '消费者心理重述')]},
  {from: 'KU-12A', to: 'KU-13', relation: 'consumer_need_to_brand_direction', evidence: [cue('CUE-033', '用户喜欢什么品牌'), cue('CUE-034', '什么品牌有魅力'), cue('CUE-035', '给出六方向')]},
  {from: 'KU-13', to: 'KU-14', relation: 'author_claimed_link', evidence: [cue('CUE-035', '方向与品牌例'), cue('CUE-037', '创始人个性关系')]},
  {from: 'KU-15', to: 'KU-16', relation: 'author_claimed_reflection_example', evidence: [cue('CUE-039', '反映品牌特性'), cue('CUE-040', '首个例子')]},
  {from: 'KU-22', to: 'KU-27', relation: 'possibly_same_presenter_referent', evidence: [frame('TARGET-0002', '开头蒙面讲述者'), frame('TARGET-0070', '结尾同一可见讲述者')]},
  {from: 'KU-01', to: 'KU-27', relation: 'closing_terminates_without_recap', evidence: [cue('CUE-002', '开头方法问题'), cue('CUE-046', '结尾告别')]},
  {from: 'KU-24', to: 'KU-22', relation: 'segmentation_with_observed_setting_continuity', evidence: [frame('TARGET-0102', '边界前同一设置'), frame('TARGET-0107', '边界后同一设置')]}
];

const cueMap = new Map([
  ['CUE-001',['KU-00','KU-OPEN','KU-22']], ['CUE-002',['KU-01']], ['CUE-003',['KU-01']], ['CUE-004',['KU-02']], ['CUE-005',['KU-02']], ['CUE-006',['KU-03']], ['CUE-007',['KU-04']], ['CUE-008',['KU-04']], ['CUE-009',['KU-04']], ['CUE-010',['KU-05']], ['CUE-011',['KU-06']], ['CUE-012',['KU-06','KU-07']], ['CUE-013',['KU-07','KU-07A']], ['CUE-014',['KU-07','KU-07A']], ['CUE-015',['KU-07','KU-07A']], ['CUE-016',['KU-06','KU-07A','KU-08']], ['CUE-017',['KU-08']], ['CUE-018',['KU-08']], ['CUE-019',['KU-08']], ['CUE-020',['KU-08']], ['CUE-021',['KU-08','KU-09']], ['CUE-022',['KU-09']], ['CUE-023',['KU-09']], ['CUE-024',['KU-09']], ['CUE-025',['KU-10']], ['CUE-026',['KU-10']], ['CUE-027',['KU-11']], ['CUE-028',['KU-11','KU-12']], ['CUE-029',['KU-11','KU-12']], ['CUE-030',['KU-11','KU-12']], ['CUE-031',['KU-11','KU-12']], ['CUE-032',['KU-06','KU-12A']], ['CUE-033',['KU-12A']], ['CUE-034',['KU-12A']], ['CUE-035',['KU-13']], ['CUE-036',['KU-13']], ['CUE-037',['KU-14']], ['CUE-038',['KU-06','KU-15']], ['CUE-039',['KU-15']], ['CUE-040',['KU-16']], ['CUE-041',['KU-17']], ['CUE-042',['KU-17','KU-18']], ['CUE-043',['KU-19']], ['CUE-044',['KU-19','KU-20']], ['CUE-045',['KU-20','KU-21']], ['CUE-046',['KU-21','KU-27']]
]);

const relationshipCoverage = [
  ['REL-01',['CUE-005','CUE-008']], ['REL-02',['CUE-008','CUE-010']], ['REL-03',['CUE-011','CUE-016','CUE-038']], ['REL-04',['CUE-013','CUE-017']], ['REL-05',['CUE-018','CUE-022','CUE-024']], ['REL-06',['CUE-011','CUE-025','CUE-038']], ['REL-07',['CUE-027','TARGET-0036','CUE-035']], ['REL-08',['CUE-035','CUE-037']], ['REL-09',['CUE-038','CUE-039','CUE-040']], ['REL-10',['TARGET-0002','TARGET-0070']], ['REL-11',['CUE-002','CUE-046']], ['REL-12',['SHOT-001','SHOT-016','TARGET-0102','TARGET-0107']], ['REL-13',['DENSE-0001','CUE-002']]
].map(([id,evidenceRefs]) => ({id, evidenced: true, evidenceRefs}));

const reconstruction = {
  schemaVersion: 'video-reconstruction-1.0',
  evidencePack: '../evidence/evidence-pack.json',
  probe: 'probe.json',
  protocol: 'capture-protocol.json',
  scopeStatement: '仅重建该视频内部可见、由提供字幕承载或经全时间轴音频分类检查的内容。作者主张不作外部事实验证；SRT、烧录字幕、白板和 OCR 冲突分别保留；负面证据只适用于已检查的 0—141.804 秒范围与所列采样。音频类别来自 AudioSet 模型，直接试听在当前运行时不受支持，曲风/来源/精确叙事作用不作推断。',
  viewerChange: JSON.parse(fs.readFileSync(path.join(runDir, 'probe.json'), 'utf8')).viewerChange,
  derivedSources: [
    {id: 'SRC-TARGETED', path: 'targeted-evidence/targeted-evidence.json', kind: 'protocol-directed frames', producedBy: 'capture-protocol-evidence.mjs using capture-protocol.json', timeRange: {start: 0, end: 141.804}, limitations: ['单帧只证明该时刻可见内容。', '每 5 秒全局采样可能漏掉样本间极短元素。', '帧序列不能证明无隐藏剪辑。']},
    {id: 'SRC-OCR', path: 'targeted-evidence/ocr-evidence.json', kind: 'macOS Vision OCR proposals', producedBy: 'ocr-frames.swift plus visual review of high-impact frames', timeRange: {start: 0, end: 141.804}, limitations: ['OCR 是提议而非真值。', '白板小字、混合中英文字和遮挡导致若干低置信结果。', '只接受了与源帧一致的高影响行，未静默修正不可辨文字。']},
    {id: 'SRC-AUDIO-CLASSIFY', path: 'audio-review/audio-classification.json', kind: 'full-timeline audio category review', producedBy: 'ffmpeg PCM extraction plus locally cached MIT AST AudioSet model, 10-second windows at 5-second hops', timeRange: {start: 0, end: 141.804}, limitations: ['当前模型运行时不支持直接试听返回音频，已明确记录这一工具边界。', 'AudioSet 分类给出概率类别，不能识别具体曲目、来源、版权或证明精确叙事意图。', '0 个 sfx-like 窗表示高排名分类未检出独立音效，不证明不存在低电平或极短音效。']}
  ],
  transcript: {
    origin: evidence.transcript.origin,
    cues: evidence.transcript.cues.map(c => ({id: c.id, start: c.start, end: c.end, text: c.text, representativeFrame: c.representativeFrame, overlappingShots: c.overlappingShots}))
  },
  knowledgeUnits,
  relations,
  coverageMatrix: {
    channels: ['CAR-01','CAR-02','CAR-03','CAR-04','CAR-05','CAR-06','CAR-07','CAR-08','CAR-09'].map(id => ({id, available: true, inspected: true})),
    meaningChanges: [
      ['MC-00',['KU-00']], ['MC-01',['KU-OPEN','KU-01']], ['MC-02',['KU-02','KU-03']], ['MC-03',['KU-04','KU-05','KU-06']], ['MC-04',['KU-07','KU-07A']], ['MC-05',['KU-08','KU-09']], ['MC-06',['KU-10','KU-11','KU-12']], ['MC-07',['KU-13','KU-14']], ['MC-08',['KU-15','KU-16','KU-17','KU-18','KU-19','KU-20','KU-21']], ['MC-09',['KU-27']], ['MC-10',['KU-12A']]
    ].map(([id,unitIds]) => ({id, captured: true, unitIds})),
    relationships: relationshipCoverage,
    criticalQuestions: [
      {id:'Q-01',status:'answered',unitIds:['KU-03','KU-04','KU-05'],evidenceRefs:['CUE-006','CUE-008','CUE-010']},
      {id:'Q-02',status:'answered',unitIds:['KU-06','KU-08','KU-11','KU-15'],evidenceRefs:['CUE-011','CUE-016','CUE-032','CUE-038']},
      {id:'Q-03',status:'answered',unitIds:['KU-07','KU-08','KU-09'],evidenceRefs:['CUE-013','CUE-018','CUE-022','TARGET-0031']},
      {id:'Q-04',status:'answered',unitIds:['KU-11','KU-13','KU-14','KU-15','KU-16','KU-17','KU-18','KU-19','KU-20','KU-21'],evidenceRefs:['TARGET-0036','CUE-035','CUE-037','CUE-038','CUE-045']},
      {id:'Q-05',status:'answered',unitIds:['KU-04','KU-05','KU-07','KU-14','KU-15','KU-25'],evidenceRefs:['CUE-010','CUE-013','CUE-037','CUE-039','TARGET-0101']},
      {id:'Q-06',status:'answered',unitIds:['KU-02','KU-12','KU-18','KU-19','KU-20','KU-27'],evidenceRefs:['CUE-005','OCR-00032','CUE-029','OCR-00264','CUE-042','OCR-00445','CUE-044','TARGET-0060']},
      {id:'Q-07',status:'unknown',unitIds:['KU-22','KU-23','KU-27'],evidenceRefs:['TARGET-0002','TARGET-0068','TARGET-0070','TARGET-0101']},
      {id:'Q-08',status:'unknown',unitIds:['KU-00','KU-25'],evidenceRefs:['DENSE-0001','TARGET-0108','OCR-00784','OCR-00785','TARGET-0086','TARGET-0101']},
      {id:'Q-09',status:'answered',unitIds:['KU-01','KU-27'],evidenceRefs:['CUE-002','CUE-046']},
      {id:'Q-10',status:'unknown',unitIds:['KU-07','KU-07A'],evidenceRefs:['CUE-013','CUE-014','CUE-015','CUE-016','TARGET-0020','TARGET-0021','TARGET-0022']},
      {id:'Q-11',status:'answered',unitIds:['KU-13'],evidenceRefs:['TARGET-0111','OCR-00814']},
      {id:'Q-12',status:'answered',unitIds:['KU-01'],evidenceRefs:['CUE-002','CUE-003','OCR-00021']},
      {id:'Q-13',status:'unknown',unitIds:['KU-26'],evidenceRefs:['SRC-AUDIO-CLASSIFY']},
      {id:'Q-14',status:'unknown',unitIds:['KU-01','KU-27'],evidenceRefs:['CUE-003','CUE-046','TARGET-0101']}
    ],
    cueAccountability: evidence.transcript.cues.map(c => ({cueId: c.id, disposition: 'knowledge', unitIds: cueMap.get(c.id) || [], rationale: `该 cue 的命题、转场、例子或结尾功能由 ${((cueMap.get(c.id) || []).join('、'))} 承接；原文仍完整保留在 transcript。`})),
    coreEvidence: {covered: knowledgeUnits.filter(u => u.importance === 'core' && u.evidence.length > 0).length, total: knowledgeUnits.filter(u => u.importance === 'core').length},
    unknowns: [
      '音乐型底层已由全时间轴分类检出；精确曲风、曲目/版权来源、音量关系、具体情绪/强调功能，以及低电平短音效是否漏检未知。',
      '讲述者真实身份、面具授权及其与账号抬头/结尾自称的真实对应。',
      '“ta媒体”的精确概念。',
      '开场数据截图对应的账号、帖子、统计窗口、真实性及其与本方法和购买转化的关系。',
      '六个人性主题与人物的精确一一映射，尤其曹德旺、刘强东、于东来的分组边界。',
      '“稳”类全部产品例子及五类是否互斥。',
      '作者所列购买动机、必火效果、品牌方向和口号的外部真实性与因果范围。',
      '隐藏剪辑是否存在。',
      '样本间是否出现过极短 CTA 或限定元素。',
      '非创始人 IP 如何具体改写创始人经历、品牌字段、例子与步骤。',
      '草根逆袭条目中刘强东/曹德旺的精确标点与分组边界。'
    ],
    uncheckedChannels: []
  },
  metaGate: {
    question: '原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',
    pass: true,
    uncheckedChannels: [],
    overlookedMeaningChanges: [],
    overlookedRelationships: [],
    rationale: 'provided SRT、烧录字幕/短卡、DENSE-0001 开场社交数据插入、白板文字与布局、讲者指向、人物/面具/环境、剪辑顺序/技术分段、有界缺席，以及 0..141.804 秒非语音音频分类均已执行检查或按工具边界保留未知；MC-00..MC-10、REL-01..REL-13、Q-01..Q-14 逐项闭合。额外关系图已补方法承诺→三底层逻辑、三底层逻辑→信任/喜爱转换、六主题→人物映射三个 audit 依赖；跨行业开场前提、消费者心理桥接、非创始人适配未知、结尾身份冲突和所有 cue 均进入知识模型。'
  }
};

fs.writeFileSync(path.join(runDir, 'reconstruction.json'), JSON.stringify(reconstruction, null, 2) + '\n');
