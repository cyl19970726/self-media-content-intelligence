import fs from 'node:fs';
import path from 'node:path';

const runDir = path.dirname(new URL(import.meta.url).pathname);
const packPath = path.resolve(runDir, '../evidence/evidence-pack.json');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

const ev = (refType, ref, supports) => ({ refType, ref, supports });
const arg = (claim, evidenceUnitIds = [], conditions = [], counterexamples = [], actions = [], limits = []) => ({ claim, evidenceUnitIds, conditions, counterexamples, actions, limits });

const units = [
  {
    id: 'KU-01', title: '开场把“看见风口却赚不到钱”设为问题', importance: 'core',
    statement: '作者以“为什么你的财富匹配不上你的认知”“知道短视频是风口，为什么赚不了钱”向观众提出核心矛盾，并承诺教普通人在自媒体平台找到自己的生意。',
    provenance: 'author_claim', timeRange: { start: 1.2, end: 8.957 },
    evidence: [ev('cue', 'CUE-001', '保留开场财富/认知问题的SRT原文'), ev('cue', 'CUE-002', '保留短视频风口问题与教学承诺'), ev('ocr', 'OCR-00039', '烧录字幕清楚显示“在自媒体平台找到自己的生意”')],
    confidence: 'high', argument: arg('观众虽知道风口，却仍需要学习如何找到自己的生意。', [], ['目标受众被设为想通过自媒体赚钱的普通人'], [], ['继续观看两条找产品路径'], ['开场没有证明认知与财富的因果关系']), unknowns: ['SRT首句“开头展示教子啊”的准确语音读法未知，画面0秒烧录字样另见冲突单元']
  },
  {
    id: 'KU-02', title: '开场用多组高指标截图拼贴建立结果暗示', importance: 'supporting',
    statement: '0至1.2秒画面叠放多张短视频界面/数据块；人工复核可见832.7万、611.9万、976.0万浏览、2903.0万浏览、1358.0万浏览及若干点赞/评论数字，但画面没有建立这些截图的账号归属、统计口径、真伪或与后续方法的因果。',
    provenance: 'visual_observation', timeRange: { start: 0, end: 1.2 },
    evidence: [ev('targeted_frame', 'TARGET-0040', '开场拼贴稳定可见'), ev('ocr', 'OCR-00449', 'OCR提出832.7万'), ev('ocr', 'OCR-00450', 'OCR提出611.9万'), ev('ocr', 'OCR-00451', 'OCR提出976.0万浏览'), ev('ocr', 'OCR-00453', 'OCR提出2903.0万浏览'), ev('ocr', 'OCR-00456', 'OCR提出1358.0万浏览')],
    confidence: 'medium', reasoning: '数字经连续6帧与原图人工对照；小型图标、部分数字和来源仍不可可靠读取。', unknowns: ['截图块的准确数量和每项图标含义并非全部可读', '账号归属、平台内统计口径、真实性和方法因果未知']
  },
  {
    id: 'KU-03', title: '可见讲述者造型与持续课程推广边界', importance: 'context',
    statement: '全片主要由一名戴红色蜘蛛侠风格面罩、穿深色上衣的人在室内白板前讲述；顶部持续出现“小红书”样式标记、圆形头像与“人类最强编导（9.4-9.6深圳线下课”字样。该造型只是可见相似性，不能证明人物身份、账号归属或IP授权。',
    provenance: 'visual_observation', timeRange: { start: 0, end: 105.215 },
    evidence: [ev('frame', 'FRAME-SHOT-002', '讲述者、面罩与白板清楚可见'), ev('ocr', 'OCR-00012', '顶部持续推广文案'), ev('targeted_frame', 'TARGET-0038', '结尾仍见同一造型与顶部条')],
    confidence: 'high', unknowns: ['人物真实身份', '头像、显示名和人物是否属于同一主体', '蜘蛛侠风格造型的授权情况', '线下课主办与支持实体']
  },
  {
    id: 'KU-04', title: '作者称短视频广告变现环境正在走弱', importance: 'core',
    statement: '作者声称，现在入局短视频、靠自媒体接广告的行业“江河日下”，品牌投放越来越少、中介返点越来越高；因此在2026年想赚钱需要找到一门自己的生意。',
    provenance: 'author_claim', timeRange: { start: 8.957, end: 17.002 },
    evidence: [ev('cue', 'CUE-004', '保留SRT中的行业判断'), ev('cue', 'CUE-005', '保留返点与2026年判断'), ev('cue', 'CUE-006', '转向自己的生意'), ev('targeted_frame', 'TARGET-0004', '烧录字幕显示“这个行业简直是江河日下”'), ev('targeted_frame', 'TARGET-0005', '烧录字幕显示“中介返点越来越高”')],
    confidence: 'high', argument: arg('2026年不能只依赖短视频广告变现，应寻找自己的生意。', [], ['面向现在才入局的普通自媒体创作者'], [], ['转向产品与生意'], ['视频没有提供品牌投放、返点或行业规模数据，也未限定平台与地区']), unknowns: ['趋势数据来源、样本、平台、地区和时间口径未知']
  },
  {
    id: 'KU-05', title: '生意公式：产品＋渠道＋广告', importance: 'core',
    statement: '作者将“生意”定义为产品、渠道、广告三项相加，并声称自媒体平台已经解决渠道和广告，所以创作者要解决的是找到自己的产品。',
    provenance: 'author_claim', timeRange: { start: 14.901, end: 22.357 },
    evidence: [ev('cue', 'CUE-006', '引出生意定义'), ev('cue', 'CUE-007', '给出三项公式与平台角色'), ev('cue', 'CUE-008', '把问题收束到产品')],
    confidence: 'high', argument: arg('自媒体平台已提供渠道和广告，个人的核心任务是产品。', [], ['作者使用的是高度压缩的商业框架'], [], ['先找产品'], ['没有讨论供应、交付、成本、定价、复购、合规或平台分发不确定性']), unknowns: ['平台是否对任何产品都能充分解决渠道与广告未知']
  },
  {
    id: 'KU-06', title: '产品成立的两个判断：有东西卖、有人买', importance: 'core',
    statement: '作者把找到产品的两个条件表述为：你有东西卖，并且你的东西有人买。',
    provenance: 'author_claim', timeRange: { start: 20.69, end: 24.665 },
    evidence: [ev('cue', 'CUE-008', '找到产品的任务'), ev('cue', 'CUE-009', '两个条件的SRT原文'), ev('targeted_frame', 'TARGET-0009', '烧录字幕可见“有东西卖…有人买”')],
    confidence: 'high', unknowns: ['视频没有给出如何验证“有人买”的操作']
  },
  {
    id: 'KU-07', title: '方法一“向外找”：先找买家，再找产品', importance: 'core',
    statement: '第一条方法是向外找：先确定买家，再围绕买家寻找产品；作者把它称为赚“风口周边的钱”。',
    provenance: 'author_claim', timeRange: { start: 24.665, end: 29.41 },
    evidence: [ev('cue', 'CUE-010', '完整保留第一方法及SRT中的“产品屋”冲突'), ev('targeted_frame', 'TARGET-0010', '烧录字幕在该时刻显示“再找产品”')],
    confidence: 'high', argument: arg('进入风口本身门槛高时，普通人可以先找风口内的获利者作为买家。', [], ['普通人缺少直接进入风口所需资本、资源或技术'], [], ['理解并共情这批客户，再寻找其需求'], ['只是策略主张，未展示市场验证']), unknowns: ['具体买家筛选标准、需求验证和成交方法未给出']
  },
  {
    id: 'KU-08', title: '作者对“风口”的修辞性定义', importance: 'supporting',
    statement: '作者把风口说成“给普通人看，但是不给普通人赚的东西”。',
    provenance: 'author_claim', timeRange: { start: 29.42, end: 32.094 },
    evidence: [ev('cue', 'CUE-011', '定义前半句'), ev('cue', 'CUE-012', '定义后半句'), ev('targeted_frame', 'TARGET-0011', '烧录字幕前半句'), ev('targeted_frame', 'TARGET-0012', '烧录字幕后半句')],
    confidence: 'high', argument: arg('风口常对普通人可见但难以直接获利。', [], ['“普通人”按作者口径理解'], [], ['转向周边机会'], ['没有证明该定义对所有风口成立']), unknowns: []
  },
  {
    id: 'KU-09', title: '房地产与AI用来说明进入风口的门槛', importance: 'supporting',
    statement: '作者举例称，十几年前知道房地产是风口，却可能没有钱和资源；现在知道AI是风口，却可能没有技术。由此提出：赚不到风口里面的钱，就去赚周边、服务已经在风口里赚到钱的人。',
    provenance: 'author_claim', timeRange: { start: 32.094, end: 43.97 },
    evidence: [ev('cue', 'CUE-013', '房地产资本/资源例子'), ev('cue', 'CUE-014', 'AI技术例子'), ev('cue', 'CUE-015', '转向周边的钱'), ev('cue', 'CUE-016', '服务已获利者并理解客户')],
    confidence: 'high', argument: arg('缺少进入风口核心所需资源时，可服务其中已获利者。', [], ['房地产例对应资本/资源门槛，AI例对应技术门槛'], [], ['共情客户并找其衍生需求'], ['没有讨论进入门槛较低的反例，也没有证明周边机会更稳定']), unknowns: []
  },
  {
    id: 'KU-10', title: '向外找的操作性推理：画像→需求→产品', importance: 'core',
    statement: '作者要求先理解、共情风口内的客户，再根据他们的生活画像推断需求，最后提出产品或服务。',
    provenance: 'author_claim', timeRange: { start: 40.425, end: 59.24 },
    evidence: [ev('cue', 'CUE-016', '先理解共情客户'), ev('cue', 'CUE-020', '锚定打手和陪玩需求的SRT冲突位置'), ev('cue', 'CUE-021', '客户画像'), ev('cue', 'CUE-022', '需求推断'), ev('cue', 'CUE-023', '产品结论'), ev('ocr', 'OCR-00185', '烧录字幕读为“第一步就是理解共情这批客户”')],
    confidence: 'high', argument: arg('客户画像可作为发现衍生需求和产品的起点。', ['KU-11', 'KU-12'], ['画像必须能代表目标客户且需求推断成立'], [], ['先找并理解买家，再提出产品'], ['视频未展示访谈、调研、付费测试或反例']), unknowns: ['“打手和陪玩”样本是否具有代表性未知']
  },
  {
    id: 'KU-11', title: '游戏/陪玩例中的买家画像', importance: 'core',
    statement: '作者声称游戏是“虚拟产品最好的生意”，陪玩行业赚到大笔的钱；随后把打手和陪玩概括为男性、年轻、熬夜、独居、点外卖。',
    provenance: 'author_claim', timeRange: { start: 43.98, end: 53.83 },
    evidence: [ev('cue', 'CUE-017', '游戏生意判断'), ev('cue', 'CUE-018', '承接风口'), ev('cue', 'CUE-019', '陪玩赚大钱判断'), ev('cue', 'CUE-020', '目标客户需求'), ev('cue', 'CUE-021', '画像属性'), ev('targeted_frame', 'TARGET-0021', '烧录字幕集中显示画像属性')],
    confidence: 'high', argument: arg('陪玩相关从业者是一批可围绕其生活方式寻找产品的买家。', [], ['作者概括的画像成立'], [], ['观察孤独和健康需求'], ['没有行业数据、样本或画像分布，不能证明普遍性']), unknowns: ['画像来源、比例与地域差异未知']
  },
  {
    id: 'KU-12', title: '从孤独/健康需求推到线下社交与营养餐食', importance: 'core',
    statement: '作者由年轻、熬夜、独居、点外卖的画像推断孤独和健康需求，并建议产品可以是线下社交和营养餐食。',
    provenance: 'author_claim', timeRange: { start: 51.086, end: 59.24 },
    evidence: [ev('cue', 'CUE-021', '画像'), ev('cue', 'CUE-022', '需求推断'), ev('cue', 'CUE-023', '产品建议'), ev('targeted_frame', 'TARGET-0022', '烧录字幕出现孤独和健康需求'), ev('targeted_frame', 'TARGET-0023', '烧录字幕出现线下社交和营养餐食')],
    confidence: 'high', argument: arg('陪玩相关人群可能购买缓解孤独或健康问题的产品。', ['KU-11'], ['画像准确且需求真实，并具有付费意愿'], [], ['可尝试线下社交或营养餐食'], ['视频未展示需求验证、价格、供给、合规、成交或效果']), unknowns: ['需求存在性、付费意愿、产品可行性和结果均未知']
  },
  {
    id: 'KU-13', title: '向外找的另外两组服务例子', importance: 'supporting',
    statement: '作者另举两例：给AI开发者做发布会组织；给电商主播提供形象和化妆服务。',
    provenance: 'author_claim', timeRange: { start: 59.25, end: 64.86 },
    evidence: [ev('cue', 'CUE-024', '两组服务例子'), ev('targeted_frame', 'TARGET-0053', '烧录字幕可见形象和化妆服务')],
    confidence: 'high', argument: arg('可为风口中的从业者提供其非核心但必要的配套服务。', [], ['目标客户确有发布会或形象服务需求'], [], ['围绕获利者提供配套服务'], ['没有展示客户、订单或服务结果']), unknowns: ['“发布会组织”的具体服务边界和交付未知']
  },
  {
    id: 'KU-14', title: '方法二“向内找”：从自己的兴趣找产品', importance: 'core',
    statement: '第二条方法是向内找，即考虑如何用自己的兴趣赚钱。作者先援引一个常见说法，再转入消费型兴趣。',
    provenance: 'author_claim', timeRange: { start: 64.87, end: 75.226 },
    evidence: [ev('cue', 'CUE-025', '第二方法'), ev('cue', 'CUE-026', '生产型兴趣句的SRT原文'), ev('cue', 'CUE-027', '生产型兴趣变现内容很多'), ev('cue', 'CUE-028', '引出自媒体时代'), ev('targeted_frame', 'TARGET-0025', '烧录字幕显示第二个方法向内找'), ev('ocr', 'OCR-00282', '烧录字幕读为“复利是培养一门生产型的兴趣”')],
    confidence: 'high', unknowns: ['CUE-026完整口语措辞在SRT与烧录字幕之间仍可能有前缀差异']
  },
  {
    id: 'KU-15', title: '消费型兴趣也能产品化并销售', importance: 'core',
    statement: '作者主张，在自媒体时代，消费型兴趣同样能做成产品、同样能卖钱，并用刷短视频、打游戏、看电影举例。',
    provenance: 'author_claim', timeRange: { start: 73.211, end: 93.865 },
    evidence: [ev('cue', 'CUE-028', '限定在自媒体时代'), ev('cue', 'CUE-029', '消费型兴趣主张并引出刷短视频'), ev('cue', 'CUE-032', '打游戏例'), ev('cue', 'CUE-033', '看电影例'), ev('targeted_frame', 'TARGET-0056', '烧录字幕可见“一样能卖钱”')],
    confidence: 'high', argument: arg('消费型兴趣也能被包装为对他人有用的服务或资料。', ['KU-16', 'KU-17', 'KU-18'], ['兴趣需要对应到特定买家问题并形成可交付物'], [], ['将消费过程转成筛选、陪伴、训练或素材整理'], ['三组例子只说明可能映射，不能证明所有消费兴趣都能卖钱']), unknowns: ['任何例子的真实销量、成本与成功率未知']
  },
  {
    id: 'KU-16', title: '刷短视频→一周热点简报', importance: 'core',
    statement: '作者建议，把刷短视频卖给年龄较大、工作忙、想做自媒体却没时间刷短视频的人，具体产品是一周热点简报。',
    provenance: 'author_claim', timeRange: { start: 75.226, end: 85.95 },
    evidence: [ev('cue', 'CUE-029', '刷短视频例'), ev('cue', 'CUE-030', '买家年龄特征'), ev('cue', 'CUE-031', '忙碌且想做自媒体的买家和热点简报')],
    confidence: 'high', argument: arg('将信息消费转化为筛选和摘要，可服务没时间刷视频的自媒体需求者。', [], ['买家愿意为热点筛选付费'], [], ['制作并售卖一周热点简报'], ['没有展示简报样品、信息源、版权边界、价格、交付或成交']), unknowns: ['简报内容标准、制作周期、售价和客户验证未知']
  },
  {
    id: 'KU-17', title: '打游戏→陪玩、代练中介和训练课', importance: 'core',
    statement: '作者把打游戏称为消费型兴趣，并建议做陪玩、代练中介和训练课。',
    provenance: 'author_claim', timeRange: { start: 85.96, end: 89.7 },
    evidence: [ev('cue', 'CUE-032', 'SRT写作“消费情绪”的冲突位置'), ev('cue', 'CUE-033', '陪玩、代练中介和训练课'), ev('ocr', 'OCR-00359', '烧录字幕明确显示“打游戏肯定是消费型兴趣”')],
    confidence: 'high', argument: arg('游戏消费经验可转成陪伴、撮合或教学服务。', [], ['具有足够游戏能力、信誉与合规条件'], [], ['提供陪玩、代练中介或训练课'], ['没有说明平台规则、账号安全、资质、价格或结果']), unknowns: []
  },
  {
    id: 'KU-18', title: '看电影→约会聊天素材包', importance: 'core',
    statement: '作者把看电影也归为消费型兴趣，并建议整理约会聊天素材包，卖给想在约会过程中“装逼”的人。',
    provenance: 'author_claim', timeRange: { start: 87.355, end: 93.865 },
    evidence: [ev('cue', 'CUE-033', '看电影与素材包'), ev('cue', 'CUE-034', '目标买家与用途'), ev('targeted_frame', 'TARGET-0033', '烧录字幕明确显示“看电影也是消费型兴趣”'), ev('targeted_frame', 'TARGET-0034', '烧录字幕显示目标买家')],
    confidence: 'high', argument: arg('电影消费可转化为面向约会场景的谈资资料。', [], ['目标买家希望获得谈资并愿意付费'], [], ['整理并售卖约会聊天素材包'], ['未展示素材包、版权边界、价格、成交或效果']), unknowns: []
  },
  {
    id: 'KU-19', title: '产品决定内容', importance: 'core',
    statement: '作者在讲完找产品后提出“产品决定内容”，并给出两种产品形态到内容形式的映射。',
    provenance: 'author_claim', timeRange: { start: 93.865, end: 102.216 },
    evidence: [ev('cue', 'CUE-035', '从产品切到怎么拍'), ev('cue', 'CUE-036', '产品决定内容并开始映射'), ev('cue', 'CUE-037', '完成映射')],
    confidence: 'high', argument: arg('应由可售产品的形态反推内容表现形式。', ['KU-20', 'KU-21'], ['作者只给出“最粗暴”的两点'], [], ['先确定服务型或资料型，再选内容形式'], ['未讨论混合产品、平台、受众、制作能力与转化路径']), unknowns: []
  },
  {
    id: 'KU-20', title: '服务型产品→第一视角vlog', importance: 'core',
    statement: '如果产品是服务型，作者建议拍第一视角vlog。',
    provenance: 'author_claim', timeRange: { start: 97.26, end: 100.026 },
    evidence: [ev('cue', 'CUE-036', '服务型到第一视角vlog映射'), ev('targeted_frame', 'TARGET-0036', '烧录字幕显示“如果你是服务型”')],
    confidence: 'high', unknowns: ['没有说明vlog的结构、发布平台、频率或转化证据']
  },
  {
    id: 'KU-21', title: '资料型产品→口播干货或图文', importance: 'core',
    statement: '如果产品是资料型，作者建议拍口播干货或图文。',
    provenance: 'author_claim', timeRange: { start: 100.026, end: 102.216 },
    evidence: [ev('cue', 'CUE-037', '资料型到口播/图文映射'), ev('ocr', 'OCR-00687', '烧录字幕显示“就拍口播干货或者是说图文”')],
    confidence: 'high', unknowns: ['没有说明内容样例、渠道、频率或效果']
  },
  {
    id: 'KU-22', title: '后果性载体冲突必须保留', importance: 'core',
    statement: '提供的SRT与烧录字幕存在多处后果性冲突：CUE-001“开头展示教子啊”对应画面“OCR候选为开头展示教资啊”，但该名词指向仍不可判定；CUE-003“自己的声”对应画面“自己的生意”；CUE-004在“品牌投放越来越”处截断，而12秒画面显示“品牌投放越来越少”；CUE-010“再找产品屋”对应画面“再找产品”；CUE-016“第一个就是”对应画面“第一步就是”；CUE-020“脑定”对应48.85秒烧录字幕“锚定”；CUE-026“最好的腹地”对应画面“复利”；CUE-032/033“消费情绪”对应画面“消费型兴趣”；CUE-038“人类最常骗的”对应画面“人类最强编导”。SRT逐字层保持原文，正文采用人工复核后的可见读法并明确冲突。',
    provenance: 'visual_observation', timeRange: { start: 0, end: 105.214 },
    evidence: [ev('cue', 'CUE-001', 'SRT原文“开头展示教子啊”'), ev('ocr', 'OCR-00443', '开场烧录/OCR候选“开头展示教资啊”'), ev('cue', 'CUE-003', 'SRT原文“自己的声”'), ev('ocr', 'OCR-00039', '烧录“自己的生意”'), ev('cue', 'CUE-004', 'SRT在“品牌投放越来越”处截断'), ev('frame', 'DENSE-0009', '12秒烧录字幕显示“品牌投放越来越少”'), ev('cue', 'CUE-010', 'SRT原文“产品屋”'), ev('ocr', 'OCR-00128', '烧录“再找产品”'), ev('cue', 'CUE-016', 'SRT原文“第一个”'), ev('ocr', 'OCR-00185', '烧录“第一步”'), ev('cue', 'CUE-020', 'SRT原文“脑定”'), ev('source', 'SRC-CC04-REPAIR', '48.85秒烧录字幕清楚显示“锚定”'), ev('cue', 'CUE-026', 'SRT原文“最好的腹地”'), ev('ocr', 'OCR-00282', '烧录“复利”'), ev('cue', 'CUE-032', 'SRT原文“消费情绪”'), ev('ocr', 'OCR-00359', '烧录“消费型兴趣”'), ev('cue', 'CUE-038', 'SRT原文“人类最常骗的”'), ev('ocr', 'OCR-00442', '烧录“人类最强编导”')],
    confidence: 'high', reasoning: '这是一个跨段、非连续的载体冲突账本，最早证据位于0.050秒，最晚证据位于103.715秒，因此单元范围覆盖0至105.214秒；范围不表示冲突连续存在。OCR仅作候选，上述行均已逐帧对照高分辨率图像。未能完整听辨的语音不被声称已纠正。', unknowns: ['实际语音在每个冲突点的精确发音未由当前工具独立听辨']
  },
  {
    id: 'KU-23', title: '白板把两条方法组织成并列关系图', importance: 'supporting',
    statement: '白板中央可辨“如何在自媒体平台找到自己的生意”主题；左侧和右侧分别承载向外找、向内找的分支，讲述者多次用笔指向相应区域，底部另有产品到拍法的手写映射。大量小字受遮挡、手写体和720×1280分辨率限制，不能可靠逐字转录。',
    provenance: 'visual_observation', timeRange: { start: 3, end: 105 },
    evidence: [ev('targeted_frame', 'TARGET-0047', '白板中部与讲述者指示'), ev('targeted_frame', 'TARGET-0051', '左侧分支与指示动作'), ev('targeted_frame', 'TARGET-0054', '右侧向内找段落'), ev('targeted_frame', 'TARGET-0058', '结尾内容形式区'), ev('ocr', 'OCR-00663', 'OCR可辨主题中的“找到自己的生意”')],
    confidence: 'medium', reasoning: '结构由跨时刻人物让位后的白板分区与指向动作确认；小字没有凭上下文补全。', unknowns: ['被人物遮挡或OCR低置信度的白板小字']
  },
  {
    id: 'KU-24', title: '技术shot边界不等于语义场景或剪辑数', importance: 'context',
    statement: '除0至1.2秒数据拼贴外，定向检查10个技术切点前后均持续看到同一面罩造型、白板、房间和橙色家具；变化主要是人物姿态、遮挡与字幕。该观察支持语义上的单一讲解场景连续性，但不能排除隐藏剪辑，也不能把11个自动分段当作剪辑次数。',
    provenance: 'visual_observation', timeRange: { start: 0, end: 105.215 },
    evidence: [ev('targeted_frame', 'TARGET-0060', '1.2秒前为拼贴'), ev('targeted_frame', 'TARGET-0061', '1.2秒后回到同一讲述场景'), ev('targeted_frame', 'TARGET-0064', '4.8秒前后白板房间连续'), ev('targeted_frame', 'TARGET-0072', '54.333秒前后主要为姿态变化'), ev('targeted_frame', 'TARGET-0079', '102.767秒附近仍为同一场景')],
    confidence: 'medium', unknowns: ['技术边界处是否存在难以凭帧对证明的隐藏剪辑']
  },
  {
    id: 'KU-25', title: '视频没有展示业务执行与结果闭环', importance: 'core',
    statement: '在0至105.215秒全时间线的字幕、每1.5秒dense帧、每5秒缺席审计帧及定向帧中，未观察到产品验证、制作、定价、发布、成交、交付、复盘或上述产品的真实销售结果；也未观察到线下课的价格或可执行报名控件。这个结论只限于所检视频内部载体。',
    provenance: 'unknown', timeRange: { start: 0, end: 105.215 },
    evidence: [ev('source', 'SRC-DENSE-PROBE', '1.5秒间隔覆盖全时间线的既有dense帧'), ev('source', 'SRC-TARGETED', 'ACT-06每5秒缺席审计及全部定向帧'), ev('cue', 'CUE-035', '口播从找产品直接跳到怎么拍'), ev('cue', 'CUE-038', '结尾直接告别')],
    confidence: 'high', reasoning: '缺席判断基于全时间线多载体扫查，而不是单一抽样点；它不声称视频外不存在相关材料。', unknowns: ['这些步骤和结果是否存在于视频之外', '课程报名是否通过发布页或账号主页另行提供']
  },
  {
    id: 'KU-26', title: '非语音音频的类型与作用未知', importance: 'context',
    statement: '媒体元数据确认存在AAC 48kHz立体声音频，静音检测未发现超过0.4秒的明显静音；但现有可用证据不能可靠判定是否含背景音乐、环境声或音效，也不能确定其叙事作用。',
    provenance: 'unknown', timeRange: { start: 0, end: 105.215 },
    evidence: [ev('source', 'SRC-AUDIO-PROBE', 'ffmpeg元数据与silencedetect检查结果')],
    confidence: 'high', reasoning: '只报告工具可观察的流属性与静音结果，不从连续能量推断音乐。', unknowns: ['音乐、环境声、音效和插入源音频的存在性及功能']
  },
  {
    id: 'KU-27', title: '结尾以账号身份和“下期再见”回收开场', importance: 'supporting',
    statement: '最后约3秒，作者结束教学、自称“人类最强编导”并说“我们下期再见”；可见自称与顶部持续显示名相呼应，把本片收束为系列账号内容，但没有追加执行证明。',
    provenance: 'visual_observation', timeRange: { start: 102.216, end: 105.215 },
    evidence: [ev('cue', 'CUE-038', 'SRT保留结尾冲突原文'), ev('ocr', 'OCR-00442', '烧录字幕显示“我是人类最强编导”'), ev('ocr', 'OCR-00701', '烧录字幕显示“我们下期再见”'), ev('targeted_frame', 'TARGET-0087', '结尾人物、顶部条与告别字幕')],
    confidence: 'high', reasoning: '账号文案与自称的文本呼应可见；人物法律身份仍不据此确认。', unknowns: ['账号显示名是否为人物真实身份或注册品牌']
  },
  {
    id: 'KU-28', title: '首批买家的实际寻找与触达路径未知', importance: 'core',
    statement: '在24.665至64.860秒“向外找”完整区间内，作者说明了先找买家、理解客户、从画像推需求并提出产品，但字幕、烧录字幕、白板与指示动作没有给出首批买家的搜索渠道、筛选标准、名单来源、联系话术、触达方式或跟进流程。该缺席仅限所检视频内部载体。',
    provenance: 'unknown', timeRange: { start: 24.665, end: 64.86 },
    evidence: [ev('cue', 'CUE-010', '提出先找买家再找产品'), ev('targeted_frame', 'TARGET-0010', '向外找段落的烧录字幕与白板状态'), ev('cue', 'CUE-016', '只进一步要求理解共情客户'), ev('targeted_frame', 'TARGET-0016', '客户理解段落的烧录字幕与白板状态'), ev('cue', 'CUE-024', '区间末尾仍停留在服务例子'), ev('targeted_frame', 'TARGET-0024', '向外找区间末尾画面'), ev('source', 'SRC-DENSE-PROBE', '1.5秒帧序列覆盖该完整区间'), ev('source', 'SRC-TARGETED', 'ACT-01/03/06覆盖字幕、白板和缺席审计')],
    confidence: 'high', reasoning: '这是对24.665至64.860秒有界机会窗口中多载体的缺席判断，不表示视频外没有获客材料。', unknowns: ['首批买家在哪里搜索', '如何筛选与建立名单', '首次联系话术与触达渠道', '后续跟进和转化流程']
  },
  {
    id: 'KU-29', title: '失败案例、不适用人群与失败条件未知', importance: 'core',
    statement: '在0至105.215秒全片中，作者提供的都是正向框架和候选例子；所检字幕、烧录字幕、白板、手势、dense帧和定向帧没有展示失败案例、反例、明确不适用人群或导致方法失败的条件。因此不能把两条找产品方法扩写成普适规则。',
    provenance: 'unknown', timeRange: { start: 0, end: 105.215 },
    evidence: [ev('cue', 'CUE-010', '开始给出向外找正向规则'), ev('cue', 'CUE-029', '用消费型兴趣的正向主张与例子展开'), ev('cue', 'CUE-036', '结尾给出正向内容映射'), ev('cue', 'CUE-038', '未补充反例即结束'), ev('source', 'SRC-DENSE-PROBE', '1.5秒帧序列覆盖全片'), ev('source', 'SRC-TARGETED', '定向帧和ACT-06缺席审计覆盖全片')],
    confidence: 'high', reasoning: '只陈述全片所检载体中未观察到这些边界，不推断现实中没有失败或反例。', unknowns: ['哪些人不适合向外找或向内找', '什么条件会使需求推断、产品建议或内容映射失败', '实际失败率与反例']
  }
];

const relations = [
  { from: 'KU-01', to: 'KU-04', relation: 'setup_to', evidence: [ev('cue', 'CUE-002', '开场承诺后进入行业判断')] },
  { from: 'KU-04', to: 'KU-05', relation: 'motivates', evidence: [ev('cue', 'CUE-005', '由变现环境转入2026年生意'), ev('cue', 'CUE-006', '开始定义生意')] },
  { from: 'KU-05', to: 'KU-06', relation: 'decomposes_product_problem_into', evidence: [ev('cue', 'CUE-008', '聚焦产品'), ev('cue', 'CUE-009', '两个产品条件')] },
  { from: 'KU-06', to: 'KU-07', relation: 'outside_method_for', evidence: [ev('cue', 'CUE-010', '第一种找产品方法')] },
  { from: 'KU-07', to: 'KU-10', relation: 'requires_buyer_understanding', evidence: [ev('cue', 'CUE-016', '先理解共情客户')] },
  { from: 'KU-10', to: 'KU-11', relation: 'instantiated_by_buyer_profile', evidence: [ev('cue', 'CUE-020', '锚定目标群体'), ev('cue', 'CUE-021', '列画像')] },
  { from: 'KU-11', to: 'KU-12', relation: 'author_infers_needs_and_products_from', evidence: [ev('cue', 'CUE-022', '由画像提出需求'), ev('cue', 'CUE-023', '给产品')] },
  { from: 'KU-07', to: 'KU-13', relation: 'illustrated_by_additional_services', evidence: [ev('cue', 'CUE-024', '两个跨风口服务例子')] },
  { from: 'KU-07', to: 'KU-14', relation: 'parallel_method_to', evidence: [ev('cue', 'CUE-010', '第一方法向外'), ev('cue', 'CUE-025', '第二方法向内')] },
  { from: 'KU-14', to: 'KU-15', relation: 'reframed_as_consumer_interest_opportunity', evidence: [ev('cue', 'CUE-026', '生产型兴趣常见说法'), ev('cue', 'CUE-029', '转为消费型兴趣')] },
  { from: 'KU-15', to: 'KU-16', relation: 'illustrated_by', evidence: [ev('cue', 'CUE-029', '刷短视频'), ev('cue', 'CUE-031', '热点简报')] },
  { from: 'KU-15', to: 'KU-17', relation: 'illustrated_by', evidence: [ev('cue', 'CUE-032', '打游戏'), ev('cue', 'CUE-033', '陪玩等产品')] },
  { from: 'KU-15', to: 'KU-18', relation: 'illustrated_by', evidence: [ev('cue', 'CUE-033', '看电影到素材包'), ev('cue', 'CUE-034', '目标买家')] },
  { from: 'KU-12', to: 'KU-19', relation: 'product_choice_precedes_content_choice', evidence: [ev('cue', 'CUE-023', '外找产品'), ev('cue', 'CUE-035', '找到产品后怎么拍')] },
  { from: 'KU-16', to: 'KU-19', relation: 'product_choice_precedes_content_choice', evidence: [ev('cue', 'CUE-031', '内找产品'), ev('cue', 'CUE-035', '找到产品后怎么拍')] },
  { from: 'KU-19', to: 'KU-20', relation: 'maps_service_product_to', evidence: [ev('cue', 'CUE-036', '服务型映射')] },
  { from: 'KU-19', to: 'KU-21', relation: 'maps_information_product_to', evidence: [ev('cue', 'CUE-037', '资料型映射')] },
  { from: 'KU-23', to: 'KU-07', relation: 'visually_groups', evidence: [ev('targeted_frame', 'TARGET-0051', '指向白板左侧')] },
  { from: 'KU-23', to: 'KU-14', relation: 'visually_groups', evidence: [ev('targeted_frame', 'TARGET-0054', '指向白板右侧')] },
  { from: 'KU-27', to: 'KU-01', relation: 'identity_payoff_for_opening', evidence: [ev('ocr', 'OCR-00012', '开场/全片顶部显示名'), ev('ocr', 'OCR-00442', '结尾自称同名')] },
  { from: 'KU-22', to: 'KU-27', relation: 'resolves_visible_wording_without_rewriting_verbatim_srt', evidence: [ev('cue', 'CUE-038', 'SRT冲突形式'), ev('ocr', 'OCR-00442', '画面读法')] },
  { from: 'KU-24', to: 'KU-23', relation: 'continuous_setting_preserves_whiteboard_context', evidence: [ev('targeted_frame', 'TARGET-0064', '切点前后同一白板'), ev('targeted_frame', 'TARGET-0079', '结尾切点仍同一场景')] }
];

const cueUnitMap = {
  'CUE-001':['KU-01','KU-22','KU-29'], 'CUE-002':['KU-01'], 'CUE-003':['KU-01','KU-22'], 'CUE-004':['KU-04','KU-22'],
  'CUE-005':['KU-04'], 'CUE-006':['KU-04','KU-05'], 'CUE-007':['KU-05'], 'CUE-008':['KU-05','KU-06'],
  'CUE-009':['KU-06'], 'CUE-010':['KU-07','KU-22','KU-28','KU-29'], 'CUE-011':['KU-08'], 'CUE-012':['KU-08'],
  'CUE-013':['KU-09'], 'CUE-014':['KU-09'], 'CUE-015':['KU-09'], 'CUE-016':['KU-09','KU-10','KU-22'],
  'CUE-017':['KU-11'], 'CUE-018':['KU-11'], 'CUE-019':['KU-11'], 'CUE-020':['KU-10','KU-11','KU-22'],
  'CUE-021':['KU-10','KU-11','KU-12'], 'CUE-022':['KU-10','KU-12'], 'CUE-023':['KU-10','KU-12'], 'CUE-024':['KU-13','KU-28'],
  'CUE-025':['KU-14'], 'CUE-026':['KU-14','KU-22'], 'CUE-027':['KU-14'], 'CUE-028':['KU-14','KU-15'],
  'CUE-029':['KU-15','KU-16','KU-29'], 'CUE-030':['KU-16'], 'CUE-031':['KU-16'], 'CUE-032':['KU-15','KU-17','KU-22'],
  'CUE-033':['KU-15','KU-17','KU-18','KU-22'], 'CUE-034':['KU-18'], 'CUE-035':['KU-19'], 'CUE-036':['KU-19','KU-20'],
  'CUE-037':['KU-19','KU-21'], 'CUE-038':['KU-22','KU-27','KU-29']
};

const meaningMap = {
  'MC-01':['KU-01','KU-02','KU-22'], 'MC-02':['KU-04','KU-05','KU-06'], 'MC-03':['KU-07','KU-08','KU-09'],
  'MC-04':['KU-10','KU-11','KU-12','KU-13'], 'MC-05':['KU-14','KU-15'], 'MC-06':['KU-16','KU-17','KU-18'],
  'MC-07':['KU-19','KU-20','KU-21'], 'MC-08':['KU-27']
};

const relationshipCoverage = [
  {id:'REL-01',evidenced:true,evidenceRefs:['CUE-001','CUE-002','CUE-004']},
  {id:'REL-02',evidenced:true,evidenceRefs:['CUE-008','CUE-009','CUE-010']},
  {id:'REL-03',evidenced:true,evidenceRefs:['CUE-016','CUE-020','CUE-023','CUE-024']},
  {id:'REL-04',evidenced:true,evidenceRefs:['CUE-010','CUE-025']},
  {id:'REL-05',evidenced:true,evidenceRefs:['CUE-029','CUE-031','CUE-033','CUE-034']},
  {id:'REL-06',evidenced:true,evidenceRefs:['CUE-023','CUE-035','CUE-036','CUE-037']},
  {id:'REL-07',evidenced:true,evidenceRefs:['CUE-031','CUE-035','CUE-036','CUE-037']},
  {id:'REL-08',evidenced:true,evidenceRefs:['OCR-00012','OCR-00442','CUE-001','CUE-038']},
  {id:'REL-09',evidenced:true,evidenceRefs:['TARGET-0051','TARGET-0054','CUE-010','CUE-025']},
  {id:'REL-10',evidenced:true,evidenceRefs:['OCR-00012','OCR-00442','TARGET-0038']}
];

const criticalCoverage = [
  {id:'CQ-01',status:'answered',unitIds:['KU-04'],evidenceRefs:['CUE-004','CUE-005','TARGET-0004','TARGET-0005']},
  {id:'CQ-02',status:'answered',unitIds:['KU-05','KU-06'],evidenceRefs:['CUE-006','CUE-007','CUE-008','CUE-009']},
  {id:'CQ-03',status:'answered',unitIds:['KU-07','KU-09','KU-10','KU-11','KU-12','KU-13'],evidenceRefs:['CUE-010','CUE-013','CUE-014','CUE-016','CUE-023','CUE-024']},
  {id:'CQ-04',status:'answered',unitIds:['KU-14','KU-15','KU-16','KU-17','KU-18'],evidenceRefs:['CUE-025','CUE-029','CUE-031','CUE-033','CUE-034']},
  {id:'CQ-05',status:'answered',unitIds:['KU-19','KU-20','KU-21'],evidenceRefs:['CUE-035','CUE-036','CUE-037']},
  {id:'CQ-06',status:'unknown',unitIds:['KU-02'],evidenceRefs:['TARGET-0040','OCR-00449','OCR-00450','OCR-00451','OCR-00453']},
  {id:'CQ-07',status:'answered',unitIds:['KU-22','KU-23'],evidenceRefs:['CUE-001','OCR-00443','CUE-003','OCR-00039','CUE-004','DENSE-0009','CUE-010','OCR-00128','CUE-016','OCR-00185','CUE-020','SRC-CC04-REPAIR','CUE-026','OCR-00282','CUE-032','OCR-00359','CUE-038','OCR-00442']},
  {id:'CQ-08',status:'unknown',unitIds:['KU-03','KU-27'],evidenceRefs:['FRAME-SHOT-002','TARGET-0038','OCR-00442']},
  {id:'CQ-09',status:'unknown',unitIds:['KU-25','KU-28','KU-29'],evidenceRefs:['CUE-010','TARGET-0010','CUE-016','TARGET-0016','CUE-024','TARGET-0024','CUE-038','TARGET-0087']},
  {id:'CQ-10',status:'answered',unitIds:['KU-27'],evidenceRefs:['CUE-001','CUE-002','CUE-038','OCR-00442']},
  {id:'CQ-11',status:'unknown',unitIds:['KU-26'],evidenceRefs:['SRC-AUDIO-PROBE']},
  {id:'CQ-12',status:'unknown',unitIds:['KU-24'],evidenceRefs:['TARGET-0060','TARGET-0061','TARGET-0064','TARGET-0079']}
];

const reconstruction = {
  schemaVersion: 'video-reconstruction-1.0',
  evidencePack: '../evidence/evidence-pack.json', probe: 'probe.json', protocol: 'capture-protocol.json',
  scopeStatement: '仅重建这段105.215秒视频内部可知内容。作者主张未做互联网核验；视觉相似性不升级为身份；缺席判断只覆盖所检全时间线字幕、dense帧、定向帧和音频元数据。尤其不能从“先找买家”补写首批买家的搜索/触达流程，也不能在没有失败案例、反例、不适用人群或失败条件时把方法扩成普适规则。',
  viewerChange: {
    before: '知道短视频或AI等风口，却未形成产品优先的自媒体生意框架。',
    after: '能用产品+渠道+广告、有东西卖+有人买、向外找与向内找两条路径，以及产品形态到内容形式映射来提出候选生意，同时知道视频未证明其市场结果。'
  },
  derivedSources: [
    {id:'SRC-TARGETED',path:'targeted-evidence/targeted-evidence.json',kind:'protocol-targeted frame manifest',producedBy:'capture-protocol-evidence.mjs using capture-protocol.json',timeRange:{start:0,end:105.215},limitations:['111个采样帧不能证明帧间连续动作','帧以720×1280源视频为上限']},
    {id:'SRC-OCR',path:'targeted-evidence/ocr-evidence.json',kind:'macOS Vision OCR proposals',producedBy:'ocr-frames.swift; high-impact rows manually checked against frames',timeRange:{start:0,end:105.215},limitations:['OCR不是原始事实','白板手写小字大量低置信或受遮挡','仅正文引用的OCR行完成了人工图像复核']},
    {id:'SRC-DENSE-PROBE',path:'../evidence/frames/dense',kind:'1.5-second full-timeline dense frame sequence',producedBy:'build-evidence-pack.mjs',timeRange:{start:0,end:105.095},limitations:['抽样不能排除帧间短暂元素','末帧105.095秒距媒体结尾0.12秒']},
    {id:'SRC-AUDIO-PROBE',path:'audio-probe-command-recorded-in-reconstruction',kind:'audio metadata and silence analysis observation',producedBy:'ffmpeg stream metadata plus silencedetect=noise=-35dB:d=0.4',timeRange:{start:0,end:105.215},limitations:['未产生可公开复听的派生音频','连续能量不能区分语音、音乐、环境声或音效','非语音音频语义未听辨']},
    {id:'SRC-CC04-REPAIR',path:'probe-contacts/repair-cc04-48.85.jpg',kind:'single repair frame for consequential caption conflict',producedBy:'ffmpeg exact-time extraction at 48.85 seconds followed by manual visual review',timeRange:{start:48.85,end:48.85},limitations:['单帧仅证明该时刻烧录字幕','不独立证明实际语音发音']}
  ],
  transcript: {
    origin: pack.transcript.origin,
    cues: pack.transcript.cues.map(c => ({id:c.id,start:c.start,end:c.end,text:c.text,representativeFrame:c.representativeFrame,overlappingShots:c.overlappingShots}))
  },
  knowledgeUnits: units,
  relations,
  coverageMatrix: {
    channels: ['CAR-01','CAR-02','CAR-03','CAR-04','CAR-05','CAR-06','CAR-07','CAR-08','CAR-09','CAR-10'].map(id => ({id,available:true,inspected:true})),
    meaningChanges: Object.entries(meaningMap).map(([id,unitIds]) => ({id,captured:true,unitIds})),
    relationships: relationshipCoverage,
    criticalQuestions: criticalCoverage,
    cueAccountability: pack.transcript.cues.map(c => ({cueId:c.id,disposition:'knowledge',unitIds:cueUnitMap[c.id] ?? [],rationale:'该cue承载作者主张、例子、转折、载体冲突或结尾语义，已链接到对应知识单元。'})),
    coreEvidence: {covered: units.filter(u=>u.importance==='core' && u.evidence.length>0).length,total:units.filter(u=>u.importance==='core').length},
    unknowns: [
      '行业趋势、客户画像、需求与产品可卖性的外部真实性和普遍范围未验证',
      '开场指标拼贴的来源、归属、真伪和方法因果未知',
      '讲述者真实身份、账号/头像归属与面罩造型授权未知',
      '课程价格、报名路径、主办/支持主体和参加条件未见于所检视频内部',
      '产品验证、制作、定价、发布、成交、交付、复盘和真实结果未见于所检视频内部',
      '24.665至64.860秒向外找区间未给出首批买家的搜索、筛选、联系、触达与跟进路径',
      '0至105.215秒全片未展示失败案例、反例、不适用人群或失败条件，方法不能扩写为普适规则',
      '白板被遮挡或分辨率不足的小字未知',
      '非语音音频类型与叙事作用未知',
      '技术切点处隐藏剪辑可能性未知'
    ],
    uncheckedChannels: []
  },
  metaGate: {
    question: '原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？',
    pass: true,
    uncheckedChannels: [], overlookedMeaningChanges: [], overlookedRelationships: [],
    rationale: '已检查逐字SRT、全片烧录字幕、白板/手势、开场插入拼贴、持续推广条、讲述者造型与场景、技术切点、开闭场关系、全时间线缺席项及音频通道；并对向外找区间的首批买家搜索/触达机会窗口、全片失败案例/反例/不适用条件机会窗口做了有界缺席登记。无法可靠识别的白板小字、非语音音频语义、身份归属和外部真实性均作为有证据范围的未知保留，没有未注册的整类载体或关系。'
  }
};

fs.writeFileSync(path.join(runDir, 'reconstruction.json'), JSON.stringify(reconstruction, null, 2) + '\n');
console.log(`wrote reconstruction.json with ${units.length} units and ${pack.transcript.cues.length} cues`);
