/* 生成期规则表：地支关系（六合/三合/相冲/相害）与生肖周运评分。
 * 仅供 scripts/fortune.ts 在生成期引用，不接入任何 Worker 运行时路由；
 * 放在 src/ 下是为了纳入 typecheck 与 vitest 单测（纯函数，零运行时依赖）。 */

export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export type Branch = (typeof BRANCHES)[number];

export const ZODIACS = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"] as const;
export type Zodiac = (typeof ZODIACS)[number];

export const ZODIAC_OF_BRANCH: Record<Branch, Zodiac> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龙", 巳: "蛇",
  午: "马", 未: "羊", 申: "猴", 酉: "鸡", 戌: "狗", 亥: "猪",
};

export const BRANCH_OF_ZODIAC: Record<Zodiac, Branch> = {
  鼠: "子", 牛: "丑", 虎: "寅", 兔: "卯", 龙: "辰", 蛇: "巳",
  马: "午", 羊: "未", 猴: "申", 鸡: "酉", 狗: "戌", 猪: "亥",
};

export const ZODIAC_EN: Record<Zodiac, string> = {
  鼠: "Rat", 牛: "Ox", 虎: "Tiger", 兔: "Rabbit", 龙: "Dragon", 蛇: "Snake",
  马: "Horse", 羊: "Goat", 猴: "Monkey", 鸡: "Rooster", 狗: "Dog", 猪: "Pig",
};

/** 六合（暗合，最强吉）：子丑、寅亥、卯戌、辰酉、巳申、午未 */
const LIUHE: ReadonlyArray<readonly [Branch, Branch]> = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];

/** 三合局：申子辰（水）、寅午戌（火）、巳酉丑（金）、亥卯未（木） */
const SANHE: ReadonlyArray<readonly Branch[]> = [
  ["申", "子", "辰"], ["寅", "午", "戌"], ["巳", "酉", "丑"], ["亥", "卯", "未"],
];

/** 六冲：子午、丑未、寅申、卯酉、辰戌、巳亥 */
const LIUCHONG: ReadonlyArray<readonly [Branch, Branch]> = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];

/** 六害：子未、丑午、寅巳、卯辰、申亥、酉戌 */
const LIUHAI: ReadonlyArray<readonly [Branch, Branch]> = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];

export type RelationKind = "六合" | "三合" | "相冲" | "相害" | "值日";

function inPairs(pairs: ReadonlyArray<readonly [Branch, Branch]>, a: Branch, b: Branch): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** 两个地支之间的关系；同一地支返回「值日」。关系互斥，按 六合→相冲→相害→三合 顺序判定。 */
export function branchRelation(a: Branch, b: Branch): RelationKind | null {
  if (a === b) return "值日";
  if (inPairs(LIUHE, a, b)) return "六合";
  if (inPairs(LIUCHONG, a, b)) return "相冲";
  if (inPairs(LIUHAI, a, b)) return "相害";
  if (SANHE.some((g) => g.includes(a) && g.includes(b))) return "三合";
  return null;
}

export function liuheOf(b: Branch): Branch {
  const pair = LIUHE.find(([x, y]) => x === b || y === b)!;
  return pair[0] === b ? pair[1] : pair[0];
}

export function liuchongOf(b: Branch): Branch {
  const pair = LIUCHONG.find(([x, y]) => x === b || y === b)!;
  return pair[0] === b ? pair[1] : pair[0];
}

export function liuhaiOf(b: Branch): Branch {
  const pair = LIUHAI.find(([x, y]) => x === b || y === b)!;
  return pair[0] === b ? pair[1] : pair[0];
}

export function sanhePartners(b: Branch): Branch[] {
  const group = SANHE.find((g) => g.includes(b))!;
  return group.filter((x) => x !== b);
}

/** 煞方位：按日支三合局推导（寅午戌日煞北、申子辰日煞南、巳酉丑日煞东、亥卯未日煞西） */
export function shaDirection(dayZhi: Branch): "东" | "南" | "西" | "北" {
  if (dayZhi === "寅" || dayZhi === "午" || dayZhi === "戌") return "北";
  if (dayZhi === "申" || dayZhi === "子" || dayZhi === "辰") return "南";
  if (dayZhi === "巳" || dayZhi === "酉" || dayZhi === "丑") return "东";
  return "西";
}

export interface DayBranchInfo {
  /** ISO 日期 YYYY-MM-DD */
  date: string;
  /** 1=周一 … 7=周日 */
  weekday: number;
  dayZhi: Branch;
}

export interface ZodiacRelation {
  date: string;
  weekday: number;
  kind: RelationKind;
}

export interface WeekZodiacScore {
  zodiac: Zodiac;
  branch: Branch;
  /** 吉日数（六合/三合天数）减凶日数（相冲/相害天数）；值日不计分 */
  score: number;
  /** 吉天数：六合 + 三合（同分排序用） */
  positives: number;
  /** 凶天数：相冲 + 相害 */
  negatives: number;
  relations: ZodiacRelation[];
}

/** 按一周七天的日支，为十二生肖分别累计关系与评分 */
export function weekZodiacScores(days: readonly DayBranchInfo[]): WeekZodiacScore[] {
  return ZODIACS.map((zodiac) => {
    const branch = BRANCH_OF_ZODIAC[zodiac];
    const relations: ZodiacRelation[] = [];
    let positives = 0;
    let negatives = 0;
    for (const day of days) {
      const kind = branchRelation(day.dayZhi, branch);
      if (!kind) continue;
      relations.push({ date: day.date, weekday: day.weekday, kind });
      if (kind === "六合" || kind === "三合") positives++;
      if (kind === "相冲" || kind === "相害") negatives++;
    }
    return { zodiac, branch, score: positives - negatives, positives, negatives, relations };
  });
}

export interface FortuneRanks {
  /** 特吉生肖（前 3） */
  teJi: Zodiac[];
  /** 次吉生肖（第 4–6） */
  ciJi: Zodiac[];
  /** 本周忠告生肖（评分最低；同分时本命年优先） */
  zhonggao: Zodiac;
}

/** 从周评分中选出特吉/次吉/忠告生肖。
 *  排序规则：评分降序 → 吉天数降序 → 生肖固定序；忠告取评分最低，同分优先本命年。
 *  该规则经 2026-08-17 周回测，可复现参考文章的吉运生肖与忠告生肖。 */
export function pickFortuneRanks(
  scores: readonly WeekZodiacScore[],
  yearZodiac: Zodiac,
): FortuneRanks {
  const zodiacOrder = (z: Zodiac) => ZODIACS.indexOf(z);
  const sorted = [...scores].sort(
    (a, b) =>
      b.score - a.score || b.positives - a.positives || zodiacOrder(a.zodiac) - zodiacOrder(b.zodiac),
  );
  const teJi = sorted.slice(0, 3).map((s) => s.zodiac);
  const ciJi = sorted.slice(3, 6).map((s) => s.zodiac);

  const lowest = [...scores].sort(
    (a, b) => a.score - b.score || zodiacOrder(a.zodiac) - zodiacOrder(b.zodiac),
  );
  const minScore = lowest[0].score;
  const tied = lowest.filter((s) => s.score === minScore);
  const zhonggao = tied.find((s) => s.zodiac === yearZodiac)?.zodiac ?? tied[0].zodiac;

  return { teJi, ciJi, zhonggao };
}
