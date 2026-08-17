import fs from 'node:fs';
import path from 'node:path';

const runDir = path.dirname(new URL(import.meta.url).pathname);
const evidencePath = path.resolve(runDir, '../evidence/evidence-pack.json');
const evidencePack = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));

const cue = (ref, supports) => ({ refType: 'cue', ref, supports });
const shot = (ref, supports) => ({ refType: 'shot', ref, supports });
const frame = (ref, supports) => ({ refType: 'targeted_frame', ref, supports });
const ocr = (ref, supports) => ({ refType: 'ocr', ref, supports });
const source = (ref, supports) => ({ refType: 'source', ref, supports });

const units = [
  {
    id: 'KU-01', title: '开场展示社媒数据截图', importance: 'supporting',
    statement: '0—2.4秒画面叠加社媒账号/笔记界面；可读数字包括832.7万、611.9万、976.0万浏览、2903.0万浏览、198.8万，画面还出现“创作状态”“笔记”。这些是视频展示的界面与数字，不是系统对账号表现的外部核验。',
    provenance: 'visual_observation', timeRange: { start: 0, end: 2.4 },
    evidence: [frame('TARGET-0001', '开场多项数字叠图'), frame('TARGET-0003', '账号/笔记界面切换'), ocr('OCR-00005', 'OCR提出832.7万'), ocr('OCR-00006', 'OCR提出611.9万'), ocr('OCR-00007', 'OCR提出976.0万浏览'), ocr('OCR-00010', 'OCR提出2903.0万浏览'), ocr('OCR-00012', 'OCR提出198.8万')],
    confidence: 'medium', reasoning: '高影响数字经帧与OCR交叉查看，但界面小字、指标名称和时间口径并非全部可读。',
    unknowns: ['数字分别对应播放、点赞、粉丝或其他指标的完整标签不全可读', '截图来源账号、统计口径与真实性未被视频内部独立建立']
  },
  {
    id: 'KU-02', title: '作者声称三天涨粉三万', importance: 'supporting',
    statement: '作者声称“那么三天时间已经三万粉丝了”；烧录字幕显示“那么三天时间已经3万粉丝了”，SRT首句前半写成不自然的“看ai偷展示教资啊”。',
    provenance: 'author_claim', timeRange: { start: 0, end: 2.686 },
    evidence: [cue('CUE-001', '保留SRT原文与三天三万粉丝主张'), frame('TARGET-0003', '烧录字幕显示三天3万粉丝'), ocr('OCR-00046', 'OCR提出烧录字幕“三天时间已经3万粉丝了”')],
    confidence: 'high', reasoning: '主张在SRT和烧录字幕中均存在；真实性不由这些载体证明。',
    argument: { claim: '三天时间已经达到三万粉丝', evidenceUnitIds: ['KU-01', 'KU-31'], conditions: [], counterexamples: [], actions: [], limits: ['约3万粉丝的可见账号状态不证明三天增长区间', '截图指标标签与时间口径未完整建立', '视频未提供独立来源'] },
    unknowns: ['增长起止账号和统计口径', '外部真实性']
  },
  {
    id: 'KU-03', title: 'IP的核心认知公式', importance: 'core',
    statement: '作者把做IP的核心作用概括为“从认识到信任，从喜欢到爱上”，并以此解释为什么现在大家都要下场做IP。',
    provenance: 'author_claim', timeRange: { start: 2.686, end: 8.003 },
    evidence: [cue('CUE-002', '提出为什么要下场做IP'), cue('CUE-003', '给出认识—信任、喜欢—爱上公式'), frame('TARGET-0152', '烧录字幕为“下场做IP”'), ocr('OCR-01275', 'OCR确认“为什么现在大家都要下场做IP”')],
    confidence: 'high', reasoning: '这是作者明确提出并在后文两次回扣的总纲。',
    argument: { claim: '个人IP能推进信任和情感关系', evidenceUnitIds: ['KU-14', 'KU-17'], conditions: ['分别在广告变现博主和企业主语境中展开'], counterexamples: [], actions: ['下场做IP'], limits: ['视频没有对该普遍机制做外部验证'] },
    unknowns: ['该公式的适用边界和效果大小']
  },
  {
    id: 'KU-04', title: '两条并列受众路线', importance: 'core',
    statement: '视频将后续讲解分成两个并列方向：广告变现博主与企业主IP；前者先讲，约92.9秒后转入后者。',
    provenance: 'raw_fact', timeRange: { start: 8.003, end: 12.21 },
    evidence: [cue('CUE-004', '宣布两个方向'), cue('CUE-005', '广告变现博主'), cue('CUE-006', '企业主IP'), cue('CUE-036', '显式转入企业主')],
    confidence: 'high',
    unknowns: []
  },
  {
    id: 'KU-05', title: '广告博主做IP的两项收益', importance: 'core',
    statement: '作者声称，广告变现博主做IP，一是增强粉丝粘性，二是提高种草率。',
    provenance: 'author_claim', timeRange: { start: 12.21, end: 16.733 },
    evidence: [cue('CUE-007', '第一项增强粉丝粘性'), cue('CUE-008', '第二项提高种草率'), frame('TARGET-0066', '烧录字幕显示第一点增强粉丝粘性')],
    confidence: 'high',
    argument: { claim: '广告变现博主需要通过IP增强粘性与种草', evidenceUnitIds: [], conditions: ['广告变现博主'], counterexamples: [], actions: ['做IP'], limits: ['视频未给出效果量化或对照证据'] },
    unknowns: ['粘性与种草率的定义和测量方法']
  },
  {
    id: 'KU-06', title: 'ID命名的两项规则', importance: 'core',
    statement: '作者说IP从ID开始，取ID需兼顾记忆点/顺口与信息量；他用“不吃香菜”“魑魅魍魉”作为不推荐的例子，但没有把这条判断证明为普遍规则。',
    provenance: 'author_claim', timeRange: { start: 15.71, end: 24.485 },
    evidence: [cue('CUE-008', 'IP从ID开始及第一项规则'), cue('CUE-009', '例子与信息量规则'), frame('TARGET-0067', '烧录字幕可读“或者魑魅魍魉”')],
    confidence: 'high',
    argument: { claim: '有效ID应有记忆点、顺口且含信息量', evidenceUnitIds: ['KU-07'], conditions: ['希望ID承担IP第一印象'], counterexamples: ['作者把“不吃香菜”“魑魅魍魉”列为不推荐例'], actions: ['设计ID时检查记忆点/顺口与信息量'], limits: ['没有数据证明这些例子一定不能做IP'] },
    unknowns: ['不同平台、行业与已有品牌是否适用同一规则']
  },
  {
    id: 'KU-07', title: '作者用自己的ID解释信息量', importance: 'supporting',
    statement: '作者以“人类最强编导”自称为例，解释该ID同时传递“教内容”和“这个人很狂”两层信息。',
    provenance: 'author_claim', timeRange: { start: 24.485, end: 29.305 },
    evidence: [cue('CUE-010', 'SRT中的作者自称与教内容'), cue('CUE-011', '第二层信息是很狂'), frame('TARGET-0154', '烧录字幕“可以从中看出两个点”'), frame('TARGET-0155', '烧录字幕“第二个点我这个人很狂”')],
    confidence: 'high',
    unknowns: ['该ID给真实受众的实际联想是否一致']
  },
  {
    id: 'KU-08', title: '人设的真实素材', importance: 'core',
    statement: '作者把性格作风、爱好、特长、身份、习惯和口头禅列为“完全真实”的人设素材。',
    provenance: 'author_claim', timeRange: { start: 29.305, end: 35.948 },
    evidence: [cue('CUE-012', '提出完全真实方向'), cue('CUE-013', '性格作风、爱好、特长'), cue('CUE-014', '身份、习惯、口头禅')],
    confidence: 'high',
    unknowns: ['“完全真实”如何验证以及是否允许选择性呈现']
  },
  {
    id: 'KU-09', title: '设计不等于造假的边界', importance: 'core',
    statement: '作者承认人设有设计成分，但明确要求把“设计”与“造假”分开。',
    provenance: 'author_claim', timeRange: { start: 35.948, end: 39.79 },
    evidence: [cue('CUE-015', '明确“设计而不是造假”'), frame('TARGET-0020', '烧录字幕显示“注意这里我说的是设计”')],
    confidence: 'high',
    argument: { claim: '人设可以设计但不应造假', evidenceUnitIds: ['KU-12', 'KU-13', 'KU-14'], conditions: ['设计不得颠覆既有人设', '缺点应无伤大雅且不伤害别人'], counterexamples: ['作者转述的fjj事件'], actions: ['从真实素材中增加设计元素'], limits: ['视频未给出造假判定流程'] },
    unknowns: ['设计与造假的具体操作边界']
  },
  {
    id: 'KU-10', title: '案例人物的载体冲突', importance: 'supporting',
    statement: 'SRT把案例人物写作“夏美和王阳洋”，烧录字幕只显示“xm和wyy”。视频内部未提供可验证的全名标签，因此两种原始载体形式都需保留；全名是否为正确展开未知。',
    provenance: 'unknown', timeRange: { start: 39.8, end: 43.639 },
    evidence: [cue('CUE-016', 'SRT原文“夏美和王阳洋”'), cue('CUE-017', 'SRT评价王阳洋'), frame('TARGET-0021', '画面烧录字幕为xm和wyy'), ocr('OCR-00239', 'OCR提出“就是xm和wyy”')],
    confidence: 'high', reasoning: '载体形式可确认，但简称对应的字面全名不由可见文字建立。',
    unknowns: ['xm/wyy的准确全名与外部身份']
  },
  {
    id: 'KU-11', title: '两个人设与情侣互动案例', importance: 'core',
    statement: '作者称wyy立了“养胃”和“花呗兽”两个人设，具有记忆点和粉丝互动性，并在情侣博主关系中强化xm的“大女主独立人设”。SRT却写成带有明显不同含义的“阳痿”“花臂少”，是后果性载体冲突。',
    provenance: 'author_claim', timeRange: { start: 43.639, end: 54.264 },
    evidence: [cue('CUE-018', '保留SRT冲突原文'), cue('CUE-019', '粉丝互动性'), cue('CUE-020', '情侣博主关系'), cue('CUE-021', '强化独立人设'), frame('TARGET-0158', '烧录字幕“第一个是养胃”'), frame('TARGET-0023', '烧录字幕“第二个是花呗兽”'), ocr('OCR-01331', 'OCR提出“第一个是养胃”'), ocr('OCR-00254', 'OCR提出“第二个是花呗兽”'), frame('TARGET-0026', '烧录字幕显示xm的大女主独立人设')],
    confidence: 'medium', reasoning: '烧录字幕的两个词经逐帧与放大查看；SRT原文必须保持但不作为支持该精确人设名的唯一形式。',
    argument: { claim: '鲜明、可互动且互相映衬的情侣人设能增强记忆和话题度', evidenceUnitIds: ['KU-10'], conditions: ['作者描述的情侣博主案例'], counterexamples: [], actions: ['增加可记忆且能形成互动的人设标签'], limits: ['视频没有展示案例账号、互动数据或对照'] },
    unknowns: ['“养胃”“花呗兽”的完整语境与外部账号表现', '作者所称效果的真实因果']
  },
  {
    id: 'KU-12', title: '人设可以增加但不能颠覆', importance: 'core',
    statement: '作者转述“两年前无忧传媒创始人”给出的原则：人设可以增加，但是不能颠覆。',
    provenance: 'author_claim', timeRange: { start: 54.264, end: 60.264 },
    evidence: [cue('CUE-022', '引出原则'), cue('CUE-023', 'SRT完整原则'), frame('TARGET-0100', '烧录字幕“人设可以增加”'), frame('TARGET-0102', '烧录字幕“但是不能颠覆”')],
    confidence: 'high',
    argument: { claim: '人设可扩展但不可推翻既有核心认知', evidenceUnitIds: ['KU-13'], conditions: ['存在稳定的原有人设'], counterexamples: ['作者转述的xm/fjj事件'], actions: ['新增人设前检查是否与原有人设冲突'], limits: ['引语来源与原始上下文未展示'] },
    unknowns: ['无忧传媒创始人的具体身份与原话出处']
  },
  {
    id: 'KU-13', title: 'fjj事件作为颠覆反例', importance: 'core',
    statement: '烧录字幕以“xm这个fjj的事件曝出”作简称，作者称它完全颠覆了xm所谓“独立大女主”的人设，因此大家不能接受。SRT把fjj误写/展开为“福利金”，但可见字幕没有建立这个展开，事件身份与事实也未被视频独立展示。',
    provenance: 'author_claim', timeRange: { start: 60.238, end: 65.23 },
    evidence: [cue('CUE-024', 'SRT原文把事件写作福利金'), cue('CUE-025', '作者称其颠覆独立人设'), frame('TARGET-0103', '人工复核烧录字幕显示xm与fjj事件简称'), frame('TARGET-0104', '烧录字幕“就完全颠覆了”'), frame('TARGET-0105', '烧录字幕“她所谓独立大女主的人设”'), frame('TARGET-0106', '烧录字幕“这是大家不能接受的”')],
    confidence: 'medium', reasoning: '事件简称与作者评价可见，但简称展开和事件本身未知。',
    argument: { claim: '与独立大女主人设相冲突的事件会引发受众不接受', evidenceUnitIds: ['KU-12'], conditions: ['受众已形成独立大女主人设认知'], counterexamples: ['xm/fjj事件（仅作者转述）'], actions: ['避免新增或事件叙事颠覆核心人设'], limits: ['事件未展示', '“大家”范围未定义', 'fjj未由画面展开'] },
    unknowns: ['fjj的准确全称与对应实体', '事件经过与公众反应']
  },
  {
    id: 'KU-14', title: '喜欢优点、爱上无伤大雅的缺点', importance: 'core',
    statement: '作者提出“喜欢一个人是喜欢优点，爱上一个人是爱上缺点”，并限定所设计的缺点必须无伤大雅、不会伤害别人；SRT在限定句前多出“周一瑶”，烧录字幕只显示“这个缺点的设计”，该人名不由可见字幕支持。',
    provenance: 'author_claim', timeRange: { start: 65.239, end: 79.33 },
    evidence: [cue('CUE-026', '回扣喜欢到爱上'), cue('CUE-027', '回扣总公式与反常识点'), cue('CUE-028', '喜欢优点'), cue('CUE-029', '爱上缺点'), cue('CUE-030', 'SRT中的周一瑶及限制'), frame('TARGET-0118', '烧录字幕为“这个缺点的设计”'), frame('TARGET-0119', '烧录字幕“无伤大雅”'), frame('TARGET-0120', '烧录字幕“不会伤害到别人的缺点”')],
    confidence: 'high',
    argument: { claim: '无伤大雅且不伤人的缺点可把喜欢推进到爱上', evidenceUnitIds: ['KU-15'], conditions: ['缺点无伤大雅', '不伤害别人'], counterexamples: [], actions: ['设计一个符合边界的缺点'], limits: ['只提供类比，不提供心理学证据', 'SRT“周一瑶”与可见字幕冲突'] },
    unknowns: ['不同受众对“无伤大雅”的判定', '该机制的普遍有效性', 'SRT“周一瑶”的来源']
  },
  {
    id: 'KU-15', title: '校园男生落泪的心疼类比', importance: 'supporting',
    statement: '作者举例：一个又高又帅、篮球厉害的校园男生因数学没考好而独自落泪，原先的喜欢会因心疼转成爱。该例是作者构造的类比，不是实证案例。',
    provenance: 'author_claim', timeRange: { start: 79.34, end: 92.897 },
    evidence: [cue('CUE-031', '校园男生优点设定'), cue('CUE-032', '从喜欢到爱的提问'), cue('CUE-033', '数学没考好'), cue('CUE-034', '独自落泪'), cue('CUE-035', '催生心疼')],
    confidence: 'high',
    argument: { claim: '脆弱瞬间可通过心疼强化情感', evidenceUnitIds: [], conditions: ['示例中的优点吸引已先成立'], counterexamples: [], actions: [], limits: ['虚构类比，不证明真实受众行为'] },
    unknowns: ['是否来自真实人物', '是否对不同受众成立']
  },
  {
    id: 'KU-16', title: '企业主范围的作者定义', importance: 'core',
    statement: '作者把“企业主”扩展为包括以卖产品为变现逻辑的博主。',
    provenance: 'author_claim', timeRange: { start: 92.897, end: 98.486 },
    evidence: [cue('CUE-036', '转入企业主'), cue('CUE-037', '以卖产品为变现逻辑的博主')],
    confidence: 'high',
    unknowns: ['服务型企业、非营利组织或纯品牌账号是否纳入']
  },
  {
    id: 'KU-17', title: '创始人IP降低用户决策成本', importance: 'core',
    statement: '作者声称，创始人IP通过“从认识到信任”降低用户决策成本，并可催生为了这个人而购买其产品的用户。',
    provenance: 'author_claim', timeRange: { start: 98.486, end: 107.892 },
    evidence: [cue('CUE-038', '提出所有企业主下场做IP'), cue('CUE-039', '认识到信任与降低决策成本'), cue('CUE-040', '因人购买')],
    confidence: 'high',
    argument: { claim: '创始人IP能降低购买决策成本并形成因人购买', evidenceUnitIds: ['KU-18', 'KU-19', 'KU-20'], conditions: ['创始人IP与企业紧密联系'], counterexamples: [], actions: ['企业主下场做IP'], limits: ['视频未展示转化漏斗、对照组或成功率'] },
    unknowns: ['降低多少决策成本', '产品质量、价格与渠道等其他变量']
  },
  {
    id: 'KU-18', title: '创始人IP与企业文化及雷军案例', importance: 'core',
    statement: '作者声称创始人IP反映企业文化；他用小米“为发烧而生”及雷军造车，说明后者巩固了“一往无前”的IP。视频没有展示小米或造车画面，只有讲述者口播。',
    provenance: 'author_claim', timeRange: { start: 107.892, end: 118.34 },
    evidence: [cue('CUE-041', '创始人IP与企业紧密联系'), cue('CUE-042', '反映企业文化'), cue('CUE-043', '雷军与小米slogan'), cue('CUE-044', '造车巩固一往无前IP'), shot('SHOT-015', '该段仍是固定讲述场景而非案例插片')],
    confidence: 'high',
    argument: { claim: '创始人行动可巩固与企业文化一致的IP', evidenceUnitIds: [], conditions: ['创始人IP与企业紧密联系'], counterexamples: [], actions: [], limits: ['案例因果仅由作者陈述', '未出现被点名主体或产品画面'] },
    unknowns: ['该口号与行动的外部准确性', '用户是否实际形成作者所述认知']
  },
  {
    id: 'KU-19', title: '于瀚与狠性/狼性文化案例', importance: 'supporting',
    statement: '人工复核烧录字幕可见“于瀚每天在抖音上发几百条视频”，并称其表演型人设彰显企业“狠性文化、狼性文化”。SRT把姓名写作“宇浩”、把“彰显”写作“增强当”，Vision OCR又误提议为“于灏”，三种形式构成载体/识别冲突；外部身份、准确拼写、数量和效果均未被视频独立证明。',
    provenance: 'author_claim', timeRange: { start: 118.34, end: 124.962 },
    evidence: [cue('CUE-045', '保留SRT“宇浩”与数百条主张'), cue('CUE-046', '世界首富与表演型人设'), cue('CUE-047', '狠性/狼性文化'), frame('TARGET-0164', '人工复核烧录字幕姓名为于瀚；OCR-01377的于灏提议被拒绝'), frame('TARGET-0126', '烧录字幕“彰显…狠性文化狼性文化”')],
    confidence: 'medium',
    argument: { claim: '高频、夸张的表演型人设可彰显企业狠性/狼性文化', evidenceUnitIds: [], conditions: ['作者所称于瀚案例'], counterexamples: [], actions: [], limits: ['可见字幕只建立字面“于瀚”，外部身份/准确拼写未核验', '每天几百条及效果未验证'] },
    unknowns: ['于瀚的外部身份与准确拼写', '“几百条”的统计口径与真实性', '企业文化效果']
  },
  {
    id: 'KU-20', title: '企业主的两种需求与规模规则', importance: 'core',
    statement: '作者说老板做IP通常有两种需求：增强品牌影响力或只求转化，并称通常由企业规模决定。',
    provenance: 'author_claim', timeRange: { start: 124.962, end: 132.26 },
    evidence: [cue('CUE-048', '提出两种需求'), cue('CUE-049', '品牌影响力、转化和规模关系'), frame('TARGET-0129', '烧录字幕“通常有两个需求”'), frame('TARGET-0130', '品牌影响力'), frame('TARGET-0131', '只求转化'), frame('TARGET-0132', '由企业规模决定')],
    confidence: 'high',
    argument: { claim: '企业规模通常决定品牌影响力或转化目标', evidenceUnitIds: ['KU-21', 'KU-22'], conditions: ['作者的咨询语境'], counterexamples: [], actions: ['先判断目标再设计IP'], limits: ['仅有两个作者转述案例', '规模口径未定义', '没有反例'] },
    unknowns: ['规模指标究竟是营收、估值、GMV或其他', '两目标是否可以同时存在']
  },
  {
    id: 'KU-21', title: '广东母婴电商案例：只求销量', importance: 'supporting',
    statement: '作者转述一位广东母婴电商老板：企业规模约五千万，不求火或有名，只希望销量增加。烧录字幕写“5,000万左右”，但未说明规模口径。',
    provenance: 'author_claim', timeRange: { start: 132.27, end: 141.87 },
    evidence: [cue('CUE-050', '广东母婴电商咨询'), cue('CUE-051', '五千万与不求火'), cue('CUE-052', '只求销量'), frame('TARGET-0135', '烧录字幕5,000万左右'), ocr('OCR-00487', 'OCR提出5,000万左右')],
    confidence: 'high',
    unknowns: ['规模口径', '案例人物/企业身份', '咨询后是否产生销量结果']
  },
  {
    id: 'KU-22', title: '香港地产案例：只求品牌影响力', importance: 'supporting',
    statement: '作者转述一位香港地产从业者：企业规模十几亿，不要求变现转化，只想推个人以增强品牌影响力。',
    provenance: 'author_claim', timeRange: { start: 141.87, end: 152.13 },
    evidence: [cue('CUE-053', '香港地产与十几亿规模'), cue('CUE-054', '不要求转化'), cue('CUE-055', '推个人、增强品牌影响力并引出两个方向'), frame('TARGET-0141', '烧录字幕十几亿规模'), frame('TARGET-0142', '不要求变现转化'), frame('TARGET-0144', '增强品牌影响力')],
    confidence: 'high',
    unknowns: ['规模口径', '案例人物/企业身份', '品牌影响力是否实际提升']
  },
  {
    id: 'KU-23', title: '观点口播方向', importance: 'core',
    statement: '企业主做IP的第一个内容方向是口播，以“立观点、立权威、立信任”为目标。SRT写作“利观点，利权威利信任”，烧录字幕清楚显示“立”。',
    provenance: 'author_claim', timeRange: { start: 152.14, end: 154.552 },
    evidence: [cue('CUE-056', '保留SRT原文'), frame('TARGET-0165', '烧录字幕“第一个就是口播”'), frame('TARGET-0147', '烧录字幕“立观点立权威立信任”'), ocr('OCR-00521', 'OCR确认“立观点立权威立信任”')],
    confidence: 'high',
    unknowns: ['具体选题、频率与执行方法']
  },
  {
    id: 'KU-24', title: '日常内容方向', importance: 'core',
    statement: '第二个内容方向是拍日常，作者称它让人更立体、更亲和并增强粘性。SRT正确写“第二种”；Vision OCR曾把烧录字幕提议为“第三种”，人工放大帧TARGET-0062/TARGET-0166确认画面实际是“第二种”，因此该OCR行不被采纳为事实。',
    provenance: 'author_claim', timeRange: { start: 154.552, end: 159.0 },
    evidence: [cue('CUE-057', 'SRT原文“第二种就是拍日常”'), cue('CUE-058', '立体与亲和'), cue('CUE-059', '增强粘性'), frame('TARGET-0062', '人工复核烧录字幕为“第二种就是拍日常”'), frame('TARGET-0167', '烧录字幕更立体更亲和')],
    confidence: 'high', reasoning: 'OCR-00531/OCR-01397为误读提议；经源帧放大人工核对拒绝。',
    unknowns: ['日常内容与观点口播能否组合', '粘性效果大小']
  },
  {
    id: 'KU-25', title: '蒙面讲述者以视觉造型实践记忆点人设', importance: 'supporting',
    statement: '全片持续出现一位穿红色连帽衫、佩戴类似蜘蛛侠面罩的讲述者，直接面向镜头、计数并指向白板；该强记忆造型与作者关于ID/人设记忆点的建议形成自我示范。画面只建立相似性，未建立人物真实身份、角色授权或来源。',
    provenance: 'visual_observation', timeRange: { start: 0, end: 162.725 },
    evidence: [frame('TARGET-0079', '开场蒙面讲述者与固定场景'), frame('TARGET-0085', '中段讲述者手势'), frame('TARGET-0091', '后段同一造型与场景'), frame('TARGET-0095', '结尾同一造型'), source('SRC-CONTACT-01', '0—82秒全时轴2秒抽样'), source('SRC-CONTACT-02', '82—163秒全时轴2秒抽样')],
    confidence: 'high',
    unknowns: ['讲述者真实身份', '面罩造型授权与来源', '是否由同一人全程出镜']
  },
  {
    id: 'KU-26', title: '平台与账号可见身份', importance: 'supporting',
    statement: '画面左上持续出现“小红书”标识，右上持续出现“人类最强编导”及圆形头像；结尾烧录字幕自报“我是人类最强编导”。SRT却写作“我是人类最想编的”，构成明确载体冲突。',
    provenance: 'visual_observation', timeRange: { start: 0, end: 162.4 },
    evidence: [frame('TARGET-0150', '开场可见平台与账号水印'), ocr('OCR-01254', 'OCR确认账号水印人类最强编导'), frame('TARGET-0169', '结尾自报人类最强编导'), ocr('OCR-01424', 'OCR确认结尾自报'), cue('CUE-059', '保留SRT冲突自报形式')],
    confidence: 'high',
    unknowns: ['账号归属与认证状态', 'SRT错转产生原因']
  },
  {
    id: 'KU-27', title: '白板是结构载体但小字多不可读', importance: 'context',
    statement: '固定白板含两侧分组、箭头、被圈/划线的词以及可见“IP”“VLOG”等零散字样；讲述者反复指向它。由于人物遮挡、手写和360像素定向帧限制，多数小字不能可靠读取，不能用口播内容反向补全白板。',
    provenance: 'visual_observation', timeRange: { start: 8, end: 157.247 },
    evidence: [frame('TARGET-0065', '白板两侧分组与讲述者'), frame('TARGET-0070', '指向白板的手势与分组'), frame('TARGET-0077', '后段白板与口播分支'), frame('TARGET-0078', 'VLOG字样附近')],
    confidence: 'medium',
    unknowns: ['白板全部逐字内容', '所有箭头和层级的准确语义']
  },
  {
    id: 'KU-28', title: '固定环境与技术分段的边界', importance: 'context',
    statement: '0—162.725秒抽样持续显示同一白板、柜体与类似洗衣设备的室内环境；evidence pack的20个shot是技术场景检测结果，不足以证明20个语义场景或20次剪辑。可见空间连续，但隐藏剪辑仍未知。',
    provenance: 'system_inference', timeRange: { start: 0, end: 162.725 },
    evidence: [shot('SHOT-001', '开场技术分段'), shot('SHOT-009', '中段代表帧'), shot('SHOT-015', '企业主段代表帧'), shot('SHOT-020', '尾帧代表'), source('SRC-CONTACT-01', '前半全时轴抽样'), source('SRC-CONTACT-02', '后半全时轴抽样')],
    confidence: 'medium', reasoning: '多个时间点共享背景提供可见连续性，但抽样与scene detection都不能排除不可见剪辑。',
    unknowns: ['准确剪辑次数', '是否存在同场景隐藏跳切']
  },
  {
    id: 'KU-29', title: '持续背景音乐与音频检查边界', importance: 'context',
    statement: '0—162.752秒机器声学审阅中，33/33个重叠窗口同时检出Music与Speech，Music在29/33窗口为最高标签；-42dB、持续0.25秒的silencedetect未检出静音段，整段频谱也连续。因此证据支持全片口播下有持续背景音乐床；未可靠建立离散音效或某一音乐变化承担特定论证转折。',
    provenance: 'system_inference', timeRange: { start: 0, end: 162.725 },
    evidence: [source('SRC-EVIDENCE-META', 'evidence pack标记AAC音轨存在'), source('SRC-AUDIO-CLASS', '33个重叠窗口的AudioSet分类结果'), source('SRC-AUDIO-LOG', '全时长静音检测与音频统计'), source('SRC-AUDIO-SPECTROGRAM', '全时长频谱连续性')],
    confidence: 'medium', reasoning: '结论来自完整解码后的自动声学分类、静音检测和频谱检查；执行模型不能直接把本地音频作为人类感知式输入，自动标签也不能确定曲目、曲风或作者意图。',
    unknowns: ['准确曲目与曲风', '低于分类可靠度的离散音效是否存在', '作者是否有意用音乐强化特定情绪或转折']
  },
  {
    id: 'KU-30', title: '结尾回扣与有界缺席', importance: 'core',
    statement: '结尾先以“更立体、更亲和、增强粘性”收束日常内容，再自报“人类最强编导”并说“下期再见”；它既回扣广告博主段的粘性，也用持续水印和蒙面造型回扣作者自己的ID/人设示范。在0—162.725秒字幕、2秒视觉抽样、开场与结尾加密帧中未观察到价格、咨询/下载入口、平台或账号门槛、地区限制或支持责任；这只是所审范围内的缺席，不能推出其他发布页面不存在这些信息。',
    provenance: 'system_inference', timeRange: { start: 155.687, end: 162.725 },
    evidence: [cue('CUE-058', '更立体更亲和'), cue('CUE-059', '增强粘性、冲突自报与告别'), frame('TARGET-0168', '关于IP就说到这里'), frame('TARGET-0169', '作者自报'), frame('TARGET-0170', '下期再见'), frame('TARGET-0173', '最后画面仍仅有持续水印与人物'), source('SRC-CONTACT-01', '前半全时轴抽样用于缺席审查'), source('SRC-CONTACT-02', '后半全时轴抽样用于缺席审查')],
    confidence: 'high', reasoning: '语义回扣由跨段文本与持续视觉身份共同支持；缺席结论严格限定在所审视频内部。',
    unknowns: ['发布页文案、评论区或账号主页是否有入口/价格/条件', '持续背景音乐是否被作者有意用于强化结尾']
  },
  {
    id: 'KU-31', title: '开场账号页的约3万粉丝结果状态', importance: 'supporting',
    statement: '1.167—2.567秒的可见小红书账号页标为“人类最强编导”，粉丝数呈约3万的结果状态。该帧只证明视频展示了这个账号标签与近3万粉丝状态，不证明账号归属、截图真实性、三天增长区间或增长由IP造成。',
    provenance: 'visual_observation', timeRange: { start: 1.167, end: 2.567 },
    evidence: [frame('TARGET-0003', '开场账号页与约3万粉丝结果状态'), frame('TARGET-0004', '同一账号页持续可见'), ocr('OCR-00034', '账号页可见创作状态'), ocr('OCR-00049', 'OCR提出账号标签“人类最强编导”')],
    confidence: 'medium', reasoning: '账号标签和近3万结果状态可见，但小字、所有权和时间因果不由单张账号页证明。',
    unknowns: ['账号所有权与截图真实性', '准确粉丝数与统计时刻', '三天区间的起点与因果']
  }
];

const relations = [
  { from: 'KU-03', to: 'KU-04', relation: 'branches_into', evidence: [cue('CUE-003', '总公式'), cue('CUE-004', '两个方向')] },
  { from: 'KU-04', to: 'KU-05', relation: 'advertising_branch_developed_by', evidence: [cue('CUE-005', '广告变现博主分支'), cue('CUE-007', '开始解释收益')] },
  { from: 'KU-05', to: 'KU-06', relation: 'implementation_begins_with', evidence: [cue('CUE-008', '从收益转到IP从ID开始')] },
  { from: 'KU-06', to: 'KU-07', relation: 'illustrated_by', evidence: [cue('CUE-009', '信息量规则'), cue('CUE-010', '作者ID例')] },
  { from: 'KU-06', to: 'KU-08', relation: 'precedes', evidence: [cue('CUE-008', 'ID起点'), cue('CUE-012', '转到组成你的因素')] },
  { from: 'KU-08', to: 'KU-09', relation: 'claim_limited_by', evidence: [cue('CUE-015', '真实素材之后增加设计边界')] },
  { from: 'KU-09', to: 'KU-11', relation: 'illustrated_by', evidence: [cue('CUE-015', '可设计'), cue('CUE-018', '两个人设案例')] },
  { from: 'KU-12', to: 'KU-13', relation: 'counterexample_supports', evidence: [cue('CUE-023', '不可颠覆原则'), cue('CUE-024', '事件反例'), cue('CUE-025', '颠覆后果')] },
  { from: 'KU-09', to: 'KU-12', relation: 'constrained_by', evidence: [cue('CUE-015', '设计边界'), cue('CUE-023', '不能颠覆')] },
  { from: 'KU-12', to: 'KU-14', relation: 'constraint_extended_by', evidence: [cue('CUE-023', '不能颠覆'), cue('CUE-030', '缺点不得伤人')] },
  { from: 'KU-03', to: 'KU-14', relation: 'promise_explained_by', evidence: [cue('CUE-003', '喜欢到爱上'), cue('CUE-026', '回扣'), cue('CUE-029', '爱上缺点')] },
  { from: 'KU-14', to: 'KU-15', relation: 'illustrated_by', evidence: [cue('CUE-030', '条件'), cue('CUE-031', '引入例子'), cue('CUE-035', '心疼机制')] },
  { from: 'KU-04', to: 'KU-16', relation: 'enterprise_branch_developed_by', evidence: [cue('CUE-006', '企业主分支'), cue('CUE-036', '转入企业主')] },
  { from: 'KU-16', to: 'KU-17', relation: 'scope_for', evidence: [cue('CUE-037', '卖产品为变现逻辑'), cue('CUE-039', '信任与决策成本')] },
  { from: 'KU-17', to: 'KU-18', relation: 'mechanism_extended_to', evidence: [cue('CUE-041', '创始人与企业紧密联系'), cue('CUE-042', '企业文化')] },
  { from: 'KU-18', to: 'KU-19', relation: 'parallel_example_with', evidence: [cue('CUE-043', '雷军案例'), cue('CUE-045', '于瀚/宇浩载体冲突案例')] },
  { from: 'KU-18', to: 'KU-20', relation: 'decision_context_for', evidence: [cue('CUE-042', '企业文化'), cue('CUE-048', '两种需求')] },
  { from: 'KU-20', to: 'KU-21', relation: 'illustrated_by_conversion_case', evidence: [cue('CUE-049', '只求转化'), cue('CUE-050', '广东案例'), cue('CUE-052', '只求销量')] },
  { from: 'KU-20', to: 'KU-22', relation: 'illustrated_by_brand_case', evidence: [cue('CUE-049', '品牌影响力'), cue('CUE-053', '香港案例'), cue('CUE-055', '增强品牌影响力')] },
  { from: 'KU-20', to: 'KU-23', relation: 'goal_informs_content_direction', evidence: [cue('CUE-055', '引出两个方向'), cue('CUE-056', '口播')] },
  { from: 'KU-20', to: 'KU-24', relation: 'goal_informs_content_direction', evidence: [cue('CUE-055', '引出两个方向'), cue('CUE-057', '日常')] },
  { from: 'KU-07', to: 'KU-25', relation: 'visually_enacted_by', evidence: [cue('CUE-011', '作者说自己很狂'), frame('TARGET-0079', '蒙面造型'), frame('TARGET-0095', '造型持续到结尾')] },
  { from: 'KU-07', to: 'KU-26', relation: 'visible_identity_confirms', evidence: [cue('CUE-010', '作者自称'), ocr('OCR-01424', '结尾烧录自报人类最强编导')] },
  { from: 'KU-03', to: 'KU-30', relation: 'opening_echoed_and_narrowed_by', evidence: [cue('CUE-003', '开场公式'), cue('CUE-059', '结尾粘性与告别')] },
  { from: 'KU-24', to: 'KU-30', relation: 'closing_payoff_for', evidence: [cue('CUE-058', '日常内容作用'), cue('CUE-059', '增强粘性并告别')] },
  { from: 'KU-31', to: 'KU-02', relation: 'shown_as_result_state_but_does_not_prove_three_day_interval', evidence: [frame('TARGET-0003', '约3万粉丝账号结果状态'), cue('CUE-001', '三天增长属于作者主张')] },
  { from: 'KU-30', to: 'KU-31', relation: 'closing_does_not_re_show_or_validate_opening_result', evidence: [cue('CUE-059', '结尾只收束主题、自报与告别'), frame('TARGET-0168', '关于IP就说到这里'), frame('TARGET-0170', '下期再见'), frame('TARGET-0173', '尾帧未重现账号结果页')] },
  { from: 'KU-25', to: 'KU-28', relation: 'persists_within_visible_setting', evidence: [source('SRC-CONTACT-01', '前半持续造型/环境'), source('SRC-CONTACT-02', '后半持续造型/环境')] },
  { from: 'KU-27', to: 'KU-04', relation: 'spatially_supports_but_does_not_fully_transcribe', evidence: [frame('TARGET-0065', '两个方向附近白板'), cue('CUE-004', '口播明确两个方向')] }
];

const cueMap = {
  'CUE-001': ['KU-02'], 'CUE-002': ['KU-03'], 'CUE-003': ['KU-03'],
  'CUE-004': ['KU-04'], 'CUE-005': ['KU-04'], 'CUE-006': ['KU-04'],
  'CUE-007': ['KU-05'], 'CUE-008': ['KU-05', 'KU-06'], 'CUE-009': ['KU-06'],
  'CUE-010': ['KU-07'], 'CUE-011': ['KU-07'],
  'CUE-012': ['KU-08'], 'CUE-013': ['KU-08'], 'CUE-014': ['KU-08'], 'CUE-015': ['KU-09'],
  'CUE-016': ['KU-10'], 'CUE-017': ['KU-10'],
  'CUE-018': ['KU-11'], 'CUE-019': ['KU-11'], 'CUE-020': ['KU-11'], 'CUE-021': ['KU-11'],
  'CUE-022': ['KU-12'], 'CUE-023': ['KU-12'], 'CUE-024': ['KU-13'], 'CUE-025': ['KU-13'],
  'CUE-026': ['KU-14'], 'CUE-027': ['KU-14'], 'CUE-028': ['KU-14'], 'CUE-029': ['KU-14'], 'CUE-030': ['KU-14'],
  'CUE-031': ['KU-15'], 'CUE-032': ['KU-15'], 'CUE-033': ['KU-15'], 'CUE-034': ['KU-15'], 'CUE-035': ['KU-15'],
  'CUE-036': ['KU-16'], 'CUE-037': ['KU-16'], 'CUE-038': ['KU-17'], 'CUE-039': ['KU-17'], 'CUE-040': ['KU-17'],
  'CUE-041': ['KU-18'], 'CUE-042': ['KU-18'], 'CUE-043': ['KU-18'], 'CUE-044': ['KU-18'],
  'CUE-045': ['KU-19'], 'CUE-046': ['KU-19'], 'CUE-047': ['KU-19'],
  'CUE-048': ['KU-20'], 'CUE-049': ['KU-20'],
  'CUE-050': ['KU-21'], 'CUE-051': ['KU-21'], 'CUE-052': ['KU-21'],
  'CUE-053': ['KU-22'], 'CUE-054': ['KU-22'], 'CUE-055': ['KU-22', 'KU-23', 'KU-24'],
  'CUE-056': ['KU-23'], 'CUE-057': ['KU-24'], 'CUE-058': ['KU-24', 'KU-30'], 'CUE-059': ['KU-24', 'KU-26', 'KU-30']
};

const mcMap = {
  'MC-01': ['KU-01', 'KU-02', 'KU-03', 'KU-31'], 'MC-02': ['KU-04'], 'MC-03': ['KU-05', 'KU-06', 'KU-07'],
  'MC-04': ['KU-08', 'KU-09'], 'MC-05': ['KU-10', 'KU-11', 'KU-12', 'KU-13'], 'MC-06': ['KU-14', 'KU-15'],
  'MC-07': ['KU-16', 'KU-17'], 'MC-08': ['KU-18', 'KU-19'], 'MC-09': ['KU-20', 'KU-21', 'KU-22'],
  'MC-10': ['KU-23', 'KU-24'], 'MC-11': ['KU-26', 'KU-30']
};

const relCoverage = {
  'REL-01': ['CUE-003', 'CUE-004'], 'REL-02': ['CUE-005', 'CUE-007'], 'REL-03': ['CUE-008', 'CUE-012'],
  'REL-04': ['CUE-015', 'CUE-018', 'CUE-023', 'CUE-025'], 'REL-05': ['CUE-023', 'CUE-030'],
  'REL-06': ['CUE-003', 'CUE-026', 'CUE-029'], 'REL-07': ['CUE-006', 'CUE-036'],
  'REL-08': ['CUE-039', 'CUE-041', 'CUE-042'], 'REL-09': ['CUE-042', 'CUE-048', 'CUE-049'],
  'REL-10': ['CUE-049', 'CUE-055', 'CUE-056', 'CUE-057'], 'REL-11': ['CUE-010', 'CUE-011', 'TARGET-0079', 'TARGET-0095'],
  'REL-12': ['CUE-003', 'CUE-058', 'CUE-059']
};

const qCoverage = {
  'Q-01': ['KU-03', 'KU-04'], 'Q-02': ['KU-05', 'KU-06', 'KU-07'], 'Q-03': ['KU-08', 'KU-09'],
  'Q-04': ['KU-10', 'KU-11', 'KU-12', 'KU-13'], 'Q-05': ['KU-14', 'KU-15'],
  'Q-06': ['KU-16', 'KU-17', 'KU-18'], 'Q-07': ['KU-18', 'KU-19'], 'Q-08': ['KU-20', 'KU-21', 'KU-22', 'KU-23', 'KU-24'],
  'Q-09': ['KU-01', 'KU-02', 'KU-31'], 'Q-10': ['KU-25', 'KU-26', 'KU-27', 'KU-28'], 'Q-11': ['KU-30'], 'Q-12': ['KU-07', 'KU-26', 'KU-30'], 'Q-13': ['KU-29']
};

const reconstruction = {
  schemaVersion: 'video-reconstruction-1.0',
  evidencePack: '../evidence/evidence-pack.json',
  probe: 'probe.json',
  protocol: 'capture-protocol.json',
  scopeStatement: '仅重建该视频内部可见、可读及提供字幕承载的内容。作者主张、视觉观察、系统推断和未知严格分离；未使用帖子文案、评论、指标后台、外部网页或其他视频。开场截图与案例均不构成外部真实性验证。',
  viewerChange: {
    before: '观众可能把做IP等同于追求知名度或把人设设计等同于造假。',
    after: '观众获得作者的两分法：广告博主围绕ID、真实特征、可增不可颠覆的人设和无害缺点增强粘性/种草；企业主围绕信任、品牌或转化目标选择观点口播与日常。',
    intendedChanges: ['认识IP的信任与情感公式', '区分广告博主与企业主路线', '掌握人设设计边界', '按企业目标选择内容方向']
  },
  derivedSources: [
    { id: 'SRC-EVIDENCE-META', path: '../evidence/evidence-pack.json', kind: 'source evidence-pack metadata', producedBy: 'build-evidence-pack.mjs', timeRange: { start: 0, end: 162.725 }, limitations: ['包内帧路径未随该holdout输入提供', 'scene-detection shots不等于语义场景'] },
    { id: 'SRC-TARGETED', path: 'targeted-evidence/targeted-evidence.json', kind: 'protocol-driven frame manifest', producedBy: 'capture-protocol-evidence.mjs using capture-protocol.json', timeRange: { start: 0, end: 162.725 }, limitations: ['帧分辨率360×640', '静帧不能单独证明完整动作或连续性'] },
    { id: 'SRC-OCR', path: 'targeted-evidence/ocr-evidence.json', kind: 'macOS Vision OCR proposals', producedBy: 'ocr-frames.swift', timeRange: { start: 0, end: 162.725 }, limitations: ['OCR为提议而非事实', '小红书水印、白板手写和细小UI存在误读', 'OCR把“第二种”误读成“第三种”，经源帧人工否决'] },
    { id: 'SRC-CONTACT-01', path: 'probe-inspection/contact-000-082.jpg', kind: '2-second visual contact sheet', producedBy: 'ffmpeg fps=1/2 tile from evidence-pack source video', timeRange: { start: 0, end: 82 }, limitations: ['缩略图不适合读取小字', '2秒采样可能遗漏短时元素'] },
    { id: 'SRC-CONTACT-02', path: 'probe-inspection/contact-082-163.jpg', kind: '2-second visual contact sheet', producedBy: 'ffmpeg fps=1/2 tile from evidence-pack source video', timeRange: { start: 82, end: 162.725 }, limitations: ['缩略图不适合读取小字', '2秒采样可能遗漏短时元素'] },
    { id: 'SRC-AUDIO-CLASS', path: 'audio-inspection/audio-classification.json', kind: 'overlapping-window acoustic classification', producedBy: 'MIT AST AudioSet classifier on decoded 16kHz mono waveform, 10-second windows every 5 seconds', timeRange: { start: 0, end: 162.725 }, limitations: ['自动分类不是人类感知式听辨', '标签不能建立曲目、曲风或编辑意图', 'Speech与Music可重叠'] },
    { id: 'SRC-AUDIO-LOG', path: 'audio-inspection/ffmpeg-audio-analysis.log', kind: 'full-timeline silence and audio-stat analysis', producedBy: 'ffmpeg silencedetect=-42dB:d=0.25 and astats', timeRange: { start: 0, end: 162.725 }, limitations: ['阈值以下短暂/低电平事件可能未被单独标出', '信号统计不能识别语义'] },
    { id: 'SRC-AUDIO-SPECTROGRAM', path: 'audio-inspection/full-spectrogram.png', kind: 'full-timeline spectrogram', producedBy: 'ffmpeg showspectrumpic from decoded 16kHz mono waveform', timeRange: { start: 0, end: 162.725 }, limitations: ['频谱连续性不能确定音乐身份或作者意图', '执行模型不支持直接本地音频感知输入'] }
  ],
  transcript: {
    origin: evidencePack.transcript.origin,
    cues: evidencePack.transcript.cues.map(({ id, start, end, text, representativeFrame, overlappingShots }) => ({ id, start, end, text, representativeFrame, overlappingShots }))
  },
  knowledgeUnits: units,
  relations,
  coverageMatrix: {
    channels: [
      { id: 'CAR-01', available: true, inspected: true }, { id: 'CAR-02', available: true, inspected: true },
      { id: 'CAR-03', available: true, inspected: true }, { id: 'CAR-04', available: true, inspected: true },
      { id: 'CAR-05', available: true, inspected: true }, { id: 'CAR-06', available: true, inspected: true },
      { id: 'CAR-07', available: true, inspected: true }, { id: 'CAR-08', available: true, inspected: true },
      { id: 'CAR-09', available: true, inspected: true }
    ],
    meaningChanges: Object.entries(mcMap).map(([id, unitIds]) => ({ id, captured: true, unitIds })),
    relationships: Object.entries(relCoverage).map(([id, evidenceRefs]) => ({ id, evidenced: true, evidenceRefs })),
    criticalQuestions: Object.entries(qCoverage).map(([id, unitIds]) => ({
      id,
      status: ['Q-07', 'Q-09', 'Q-10', 'Q-11'].includes(id) ? 'unknown' : 'answered',
      unitIds,
      evidenceRefs: units.filter(u => unitIds.includes(u.id)).flatMap(u => u.evidence.map(e => e.ref)).slice(0, 12)
    })),
    cueAccountability: evidencePack.transcript.cues.map(c => ({
      cueId: c.id,
      disposition: 'knowledge',
      unitIds: cueMap[c.id] || [],
      rationale: `该cue的主张、结构、案例、限定或结尾功能映射至${(cueMap[c.id] || []).join('、')}；原文仍完整保留在transcript。`
    })),
    coreEvidence: { covered: units.filter(u => u.importance === 'core' && u.evidence.length > 0).length, total: units.filter(u => u.importance === 'core').length },
    unknowns: [
      '作者/讲述者真实身份与面罩造型授权', '案例人物、事件、增长、数量和咨询轶事的外部真实性',
      'xm/wyy/fjj简称的准确展开', '白板大多数小字与全部箭头语义', '企业规模口径及规模到目标的普遍因果',
      '持续背景音乐的准确曲目/曲风、低可靠度离散音效及作者赋予的具体情绪/转折意图', '准确剪辑次数与隐藏剪辑',
      '视频外发布页是否包含价格、入口、平台/账号/地区要求或支持责任'
    ],
    uncheckedChannels: []
  },
  metaGate: {
    question: '原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',
    pass: true,
    uncheckedChannels: [],
    overlookedMeaningChanges: [],
    overlookedRelationships: [],
    rationale: '字幕、烧录字幕/水印、开场社媒截图、人物/手势/造型、白板、固定环境、技术分段与编辑顺序、非语言音频、全时轴有界缺席均已检查并进入重建。非语言音频已完成0—162.752秒解码、33个重叠AudioSet窗口、静音检测和全时长频谱检查：持续背景音乐床得到支持，未可靠建立离散音效或特定语义转折；执行模型不支持直接感知式音频输入，故曲目/曲风/作者意图仍明确为未知。开场约3万粉丝账号结果状态与三天增长主张已拆分，结尾未重现或验证该结果的关系已显式建模。白板不可读小字、fjj/xm/wyy简称展开、于瀚外部身份与其他外部真实性均未被猜测补全。11个意义变化、12个探针关系、13个关键问题和59个cue均逐项有落点。'
  }
};

fs.writeFileSync(path.join(runDir, 'reconstruction.json'), JSON.stringify(reconstruction, null, 2) + '\n');

const article = `# 为什么要做IP：一条关于信任、人设边界与企业目标的两分法

这条视频的总纲很短：作者把IP概括成“从认识到信任，从喜欢到爱上”，然后分别向广告变现博主与企业主展开。以下只还原视频内部的主张、案例和可见证据，不替作者验证增长、人物、事件或商业效果。

## 开场承诺：增长截图与核心公式

0:00—0:02，画面先叠加社媒指标拼图，可读到832.7万、611.9万、976.0万浏览、2903.0万浏览、198.8万等数字；随后出现标为“人类最强编导”、粉丝数约3万的小红书账号页。作者同时声称“三天时间已经三万粉丝了”。账号页只建立视频展示了这个结果状态，不证明账号归属、截图真实性、三天增长区间或增长由IP造成（TARGET-0001、TARGET-0003；KU-01、KU-02、KU-31）。

2.686—8.003秒，作者提出总公式：“从认识到信任，从喜欢到爱上。”SRT把“下场做IP”错转成“下次做IP”，烧录字幕明确是“下场做IP”（TARGET-0152；KU-03）。

## 广告变现博主：从ID到人设边界

视频先讲广告变现博主。作者声称做IP有两项收益：增强粉丝粘性、提高种草率（12.210—16.733秒；KU-05）。执行起点是ID：既要有记忆点、顺口，也要有信息量。他以“人类最强编导”为例，说这个名字同时传递“教内容”和“这个人很狂”（15.710—29.305秒；KU-06、KU-07）。

接着，作者把性格作风、爱好、特长、身份、习惯、口头禅列为真实的人设素材，又补上一条边界：人设可以设计，但设计不等于造假（29.305—39.790秒；KU-08、KU-09）。

案例段存在重要载体冲突。SRT写“夏美和王阳洋”，烧录字幕只写“xm和wyy”；SRT又把两个人设转成“阳痿”“花臂少”，逐帧烧录字幕实际为“养胃”“花呗兽”（TARGET-0158、TARGET-0023）。作者的主张是：鲜明人设产生记忆点和互动话题，并能在情侣关系中强化xm的“大女主独立人设”。视频没有展示案例账号、互动数据或可核验来源，因此只能按作者案例保留（39.800—54.264秒；KU-10、KU-11）。

作者随后转述一条原则：“人设可以增加，但是不能颠覆。”反例的烧录字幕写“xm这个fjj的事件曝出”，而SRT把fjj误写/展开为“福利金”；视频没有建立这个展开，也没有展示事件本身。作者只声称该事件颠覆了“独立大女主”人设，因而不被接受（54.264—65.230秒；KU-12、KU-13）。

## 从喜欢到爱上：必须保留的限制条件

65.239—79.330秒，作者回扣总公式，提出“喜欢优点、爱上缺点”的反常识观点。但他没有主张任意缺点都有效，而是限定：缺点必须无伤大雅，并且不会伤害别人。SRT在这句话前多出“周一瑶”，烧录字幕只显示“这个缺点的设计”，所以该人名不能被当作确定 referent（KU-14）。

79.340—92.897秒的校园类比说明作者想表达的心理路径：一个又高又帅、篮球厉害的男生，因为数学没考好而独自落泪，使旁观者由喜欢转为心疼和爱。这是构造的说明例，不是心理机制的实证（KU-15）。

## 企业主IP：信任、文化、目标与内容方向

作者把企业主扩展为“以卖产品为变现逻辑的博主”。他的核心主张是：创始人IP把认识推进到信任，降低用户决策成本，并形成“为了这个人买产品”的用户（92.897—107.892秒；KU-16、KU-17）。

接下来，作者把创始人IP与企业文化相连。他用雷军、小米“为发烧而生”和造车来说明“一往无前”的IP；又用可见字幕所写的“于瀚每天在抖音上发几百条视频、说要当世界首富”说明表演型人设如何彰显“狠性文化、狼性文化”。SRT写作“宇浩”，Vision OCR曾误提议“于灏”；人工复核画面支持字面“于瀚”，但外部身份和准确拼写仍未知。视频没有出现这些主体或产品的插入画面，也没有验证“每天几百条”或文化效果（107.892—124.962秒；KU-18、KU-19）。

老板做IP，在作者的框架里有两种需求：增强品牌影响力，或只求转化；作者进一步声称这通常由企业规模决定（124.962—132.260秒；KU-20）。他给出两个咨询轶事：

- 广东母婴电商老板，规模约5,000万，不求火或有名，只求销量增加（132.270—141.870秒；KU-21）。
- 香港地产从业者，企业规模十几亿，不求变现转化，只想推个人、增强品牌影响力（141.870—152.130秒；KU-22）。

“五千万”“十几亿”究竟指营收、估值、GMV还是其他口径，视频没有说明；两个轶事只能说明作者的分类，不能证明企业规模普遍决定IP目标。

最终给出的内容方向也是两条：第一，观点口播，用于“立观点、立权威、立信任”；第二，拍日常，让人更立体、更亲和、增强粘性（152.140—159.000秒；KU-23、KU-24）。Vision OCR一度把“第二种”提议成“第三种”，但放大源帧确认烧录字幕实际是“第二种”，因此没有采用该OCR误读。

## 视频本身如何实践“人设”

全片是一位红色连帽衫、戴类似蜘蛛侠面罩的讲述者，持续在白板和类似洗衣设备前讲解、计数和指板。这个强记忆造型，与作者关于“记忆点”“我这个人很狂”的建议形成自我示范；但它不证明人物真实身份、角色授权或来源（KU-25）。左上持续出现“小红书”，右上持续出现“人类最强编导”。结尾烧录字幕也自报“我是人类最强编导”，而SRT错转为“我是人类最想编的”（160.300秒，TARGET-0169；KU-26）。

白板确有两侧分组、箭头、圈划和“IP”“VLOG”等零散字样，但人物遮挡、手写与定向帧分辨率使大多数小字不可可靠读取；不能用口播反向补全它。全片可见背景连续，却也不能把evidence pack的20个技术shot当作20个语义场景或剪辑，隐藏跳切仍未知（KU-27、KU-28）。

## 视频没有建立什么

视频内部没有独立验证开场增长、案例人物与事件、每天数百条视频、咨询规模规则或任何转化结果。0—162.725秒字幕、2秒视觉抽样与开闭段加密帧中，也未观察到价格、咨询/下载入口、平台或账号门槛、地区限制与支持责任；该结论只限于所审视频，不适用于未提供的发布页、评论区或主页。

非语言音频已经单独检查：整条音轨解码后，以33个重叠10秒窗口覆盖全时长，所有窗口都同时检出Music与Speech，Music在29个窗口为最高标签；-42dB、0.25秒阈值下未检出静音段，频谱也连续。这支持“全片口播下有持续背景音乐床”，但不支持确定曲目、曲风、离散音效或作者让音乐承担某个具体转折。执行模型无法直接把本地音频作为人类感知式输入，因此这里是完整机器声学审阅，不冒充人工听辨（KU-29）。

结尾不是纯告别：它先用“更立体、更亲和、增强粘性”收束日常内容，再以“人类最强编导”和“下期再见”回到作者自身的ID与人设示范，也把开场的关系公式收窄到一个具体结果——粘性。结尾没有再次展示账号页，也没有重新验证“约3万粉丝来自三天增长”的开场主张；这条无结果回证关系已单独保留（KU-30→KU-31）。
`;

fs.writeFileSync(path.join(runDir, 'article.md'), article);
console.log(JSON.stringify({ reconstruction: path.join(runDir, 'reconstruction.json'), article: path.join(runDir, 'article.md'), units: units.length, cues: reconstruction.transcript.cues.length }, null, 2));
