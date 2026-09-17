/**
 * 封面图 prompt 规则引擎（纯函数，scripts/cover.ts CLI 与 test/cover-prompt.test.ts 共用）
 *
 * 设计：不只是一张「生肖图」——画面由四层信号合成：
 * 1. 情绪（吉凶）：黄道/黑道天神定基调，吉凶神数量对比细分「吉 / 凶中化解 / 晦」三档，
 *    吉日金光朝霞、凶日阴雨暮色，吉日凶煞偏多时叠加「吉中带谨」远景云影
 * 2. 纳音五行场景：纳音尾字归五行（沙中金→金、天河水→水），各有意象池
 * 3. 生肖主角：外形特征表防画错（蛇≠龙）
 * 4. 构图视角：按日期确定性随机（同日重跑稳定，不同日错开）
 *
 * 不用 LLM 生成 prompt：防错锚句与「画面无文字」约束必须原样保留，
 * 且生成期工具需要可复现、可测试；LLM 文学化润色留作二期可选开关。
 */

// ── 输入（compute() 输出的结构化子集） ───────────────────

export interface CoverAlmanacData {
  zodiac: string;
  naYin: string;
  wuxing: string;
  tianShenLuck: string;
  jiShen: readonly string[];
  xiongSha: readonly string[];
  jieQi: string;
}

// ── 情绪分级 ─────────────────────────────────────────────

export type Mood = "auspicious" | "resolving" | "somber";

/**
 * 吉 / 凶中化解 / 晦
 * - 黄道六神值日 → 吉
 * - 黑道值日但吉神比凶煞多 2 及以上 → 凶中化解（阴转多云）
 * - 其余 → 晦（阴郁）
 */
export function classifyMood(d: CoverAlmanacData): Mood {
  if (d.tianShenLuck === "吉") return "auspicious";
  if (d.jiShen.length >= d.xiongSha.length + 2) return "resolving";
  return "somber";
}

/** 吉日但凶煞偏多 → 画面明亮但远景带一层薄云阴影（吉中带谨） */
function hasCautiousNote(d: CoverAlmanacData): boolean {
  return d.tianShenLuck === "吉" && d.xiongSha.length > d.jiShen.length;
}

const MOOD_SCENES: Record<Mood, readonly string[]> = {
  auspicious: ["金光万丈、朝霞满天", "云开雾散、天光澄澈", "惠风和畅、天青日朗"],
  resolving: ["阴转多云、云隙间透出天光", "雨过初晴、雾散见山", "暮色中透出一线暖光"],
  somber: ["阴雨低云、雾锁山林", "暮色四合、细雨绵绵", "乌云低垂、寒烟漠漠"],
};

const MOOD_ACTIONS: Record<Mood, readonly string[]> = {
  auspicious: ["昂首挺立、意气风发", "奋蹄向前、神采飞扬", "信步山野、怡然自得"],
  resolving: ["静立回望、神态安详", "低首觅食、从容不惊"],
  somber: ["低首敛息、静静伫立", "蜷卧避风、神情警觉", "驻足檐下、若有所思"],
};

const MOOD_PALETTES: Record<Mood, string> = {
  auspicious: "色调暖金明快",
  resolving: "色调中和温润，明暗相济",
  somber: "色调冷灰黛蓝，阴郁沉静",
};

// ── 纳音五行场景 ─────────────────────────────────────────

const WUXING = ["金", "木", "水", "火", "土"] as const;

/** 纳音尾字归五行（沙中金→金、天河水→水）；解析失败回落日干五行 */
export function elementOf(d: CoverAlmanacData): string {
  const last = d.naYin.slice(-1);
  return (WUXING as readonly string[]).includes(last) ? last : d.wuxing;
}

const ELEMENT_SCENES: Record<string, readonly string[]> = {
  金: ["砂砾滩涂泛着鎏金光泽", "秋阳斜照金石岩壁", "白露凝霜的清朗石原"],
  木: ["翠竹幽林、藤蔓青青", "春山新绿、草木葱茏", "古树参天的静谧林间"],
  水: ["烟雨溪涧、云水氤氲", "江河倒影、水天一色", "清泉石上的幽涧"],
  火: ["晚霞流火映红天际", "暖岩赤枫、点点灯火", "朝霞如焰洒满山峦"],
  土: ["黄土山原、沟壑纵横", "厚土坡岭、梯田层叠", "苍茫大地、远山如黛"],
};

// ── 生肖主角（防错锚句，务必原样保留在 prompt 中） ────────

/** 十二生肖外形特征表：生图模型常把「蛇」画成龙，必须显式消歧 */
export const ZODIAC_APPEARANCE: Record<string, string> = {
  鼠: "一只灵巧的小老鼠，尖吻圆耳、细长尾巴",
  牛: "一头温顺健壮的黄牛，双角弯月形",
  虎: "一只威风凛凛的老虎，虎纹鲜明",
  兔: "一只温顺可爱的白兔，长耳短尾",
  龙: "一条神采奕奕的中国龙，鹿角蛇身、鹰爪飘逸",
  蛇: "一条翡翠绿色的小青蛇，形似真实的竹叶青蛇：圆钝的小三角头、红色信子、纤细修长的身体，正优雅地盘绕在山岩灵芝之上",
  马: "一匹俊逸矫健的骏马，鬃毛飞扬",
  羊: "一只温顺优雅的山羊，卷角有须",
  猴: "一只聪明灵动的猴子，体态轻盈",
  鸡: "一只昂首挺立的雄鸡，彩羽金冠",
  狗: "一只忠诚俊朗的猎犬，体态匀称",
  猪: "一头圆润憨态的猪，体态丰腴",
};

// ── 构图（按日期确定性随机：同日重跑稳定，跨日错开） ─────

const COMPOSITIONS = ["近景特写", "中景山岩", "远景苍茫", "月下剪影", "晨雾弥漫"] as const;

/** 字符串散列 → 稳定非负整数 */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pick<T>(arr: readonly T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

// ── 组装 ─────────────────────────────────────────────────

export interface CoverPrompt {
  prompt: string;
  mood: Mood;
  element: string;
  composition: string;
}

export const MOOD_LABELS: Record<Mood, string> = {
  auspicious: "吉",
  resolving: "化解",
  somber: "晦",
};

/** 由当日黄历数据组装生图 prompt（国风水墨、画面不含文字避免乱码） */
export function buildCoverPrompt(d: CoverAlmanacData, date: string): CoverPrompt {
  const mood = classifyMood(d);
  const element = elementOf(d);
  const composition = pick(COMPOSITIONS, `${date}:comp`);
  const appearance = ZODIAC_APPEARANCE[d.zodiac] ?? `一只优雅的生肖${d.zodiac}`;

  const lines = [
    "中国传统水墨画与工笔重彩结合的横幅插画。",
    `画面主角是${appearance}（生肖${d.zodiac}）`,
    `——${pick(MOOD_SCENES[mood], `${date}:scene`)}，主角${pick(MOOD_ACTIONS[mood], `${date}:act`)}`,
    `。环境是${pick(ELEMENT_SCENES[element] ?? ELEMENT_SCENES[d.wuxing], `${date}:env`)}。`,
    `构图采用${composition}的视角，${MOOD_PALETTES[mood]}。`,
  ];
  if (hasCautiousNote(d)) {
    lines.push("远景薄云流转，明丽中隐含一分谨慎之气。");
  }
  if (d.jieQi) {
    lines.push(`画面融入「${d.jieQi}」节气的物候意象。`);
  }
  lines.push("画面中不得出现任何文字、数字、印章、边框或水印。");

  return { prompt: lines.join(""), mood, element, composition };
}
