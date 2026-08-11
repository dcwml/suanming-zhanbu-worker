/* 六爻起卦页脚本：手动投掷录入 → 算卦排盘 → 查表 → 请求周易解读 */
(function () {
  "use strict";

  var app = document.getElementById("liuyao-app");
  if (!app) return;
  var LANG = app.dataset.lang === "en" ? "en" : "zh";

  /* ---------- i18n 文案 ---------- */
  var T = {
    zh: {
      lineLabels: ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"],
      options: ["三字（老阴 6）", "两字一背（少阳 7）", "一字两背（少阴 8）", "三背（老阳 9）"],
      optionValues: [6, 7, 8, 9],
      primary: "本卦", changed: "变卦",
      resultTitle: "投掷结果",
      loading: "正在解读…", retry: "重试", failed: "解读失败：",
      noQuestion: "请先输入所求之事",
      mdLibLoading: "解读组件未完全加载，请稍后重试",
      errMap: {
        rate_limited: "问卦的人有点多，天师正在逐一回复，请稍等片刻再来",
        upstream_timeout: "天师凝神推演超时了，请再试一次",
        upstream_error: "天师暂时没空，稍后再来问问吧",
        not_configured: "天师暂时没空，稍后再来问问吧",
        invalid_request: "卦帖写得不太对，请核对后再递上来",
        payload_too_large: "卦帖太长了，请精简后再递上来",
        invalid_json: "卦帖写得不太对，请核对后再递上来",
        cdn_failed: "历书没能送达，请刷新页面或检查网络",
      },
    },
    en: {
      lineLabels: ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6"],
      options: ["3 inscribed (Old Yin 6)", "2 inscribed 1 other (Young Yang 7)", "1 inscribed 2 other (Young Yin 8)", "3 other (Old Yang 9)"],
      optionValues: [6, 7, 8, 9],
      primary: "Primary Hexagram", changed: "Changed Hexagram",
      resultTitle: "Casting Result",
      loading: "Interpreting…", retry: "Retry", failed: "Reading failed: ",
      noQuestion: "Please enter your question first",
      mdLibLoading: "Reading components not fully loaded, please retry later",
      errMap: {
        rate_limited: "The Master is attending to many visitors — please return in a few moments.",
        upstream_timeout: "The Master's reading ran long — please try again.",
        upstream_error: "The Master is unavailable right now — please check back later.",
        not_configured: "The Master is unavailable right now — please check back later.",
        invalid_request: "Something in your request looks off — please double-check and try again.",
        payload_too_large: "Your request is a bit too long — please trim it and try again.",
        invalid_json: "Something in your request looks off — please double-check and try again.",
        cdn_failed: "The almanac failed to load — please refresh or check your connection.",
      },
    },
  }[LANG];

  /* ---------- 算卦纯函数 ---------- */
  var TRIGRAM_NAMES = {
    zh: { 0: "坤", 1: "震", 2: "坎", 3: "兌", 4: "艮", 5: "離", 6: "巽", 7: "乾" },
    en: { 0: "Kun 坤", 1: "Zhen 震", 2: "Kan 坎", 3: "Dui 兌", 4: "Gen 艮", 5: "Li 離", 6: "Xun 巽", 7: "Qian 乾" },
  };

  var KING_WEN = [
    [2, 16, 8, 45, 23, 35, 20, 12],
    [24, 51, 3, 17, 27, 21, 42, 25],
    [7, 40, 29, 47, 4, 64, 59, 6],
    [19, 54, 60, 58, 41, 38, 61, 10],
    [15, 62, 39, 31, 52, 56, 53, 33],
    [36, 55, 63, 49, 22, 30, 37, 13],
    [46, 32, 48, 28, 18, 50, 57, 44],
    [11, 34, 5, 43, 26, 14, 9, 1],
  ];

  function isYang(v) { return v === 7 || v === 9; }

  function trigramIndex(lines, start) {
    return (isYang(lines[start]) ? 1 : 0) + (isYang(lines[start + 1]) ? 2 : 0) + (isYang(lines[start + 2]) ? 4 : 0);
  }

  function primaryNo(lines) {
    return KING_WEN[trigramIndex(lines, 0)][trigramIndex(lines, 3)];
  }

  function movingPositions(lines) {
    var pos = [];
    for (var i = 0; i < 6; i++) if (lines[i] === 6 || lines[i] === 9) pos.push(i + 1);
    return pos;
  }

  function transformLines(lines) {
    return lines.map(function (v) {
      if (v === 6) return 7;
      if (v === 9) return 8;
      return v;
    });
  }

  function changedNo(lines) {
    var m = movingPositions(lines);
    if (m.length === 0) return null;
    var t = transformLines(lines);
    return KING_WEN[trigramIndex(t, 0)][trigramIndex(t, 3)];
  }

  /* ---------- 64 卦文本表 ---------- */
  /* 每条：{ name:{zh,en}, statement:{zh,en}, lines:{zh:[6],en:[6]} }
     数组索引 0-63 对应序号 1-64。
     Chinese texts from 《周易》通行本; English from Wilhelm translation. */
  var HEXAGRAMS = [
    { /* 1 乾为天 */
      name: { zh: "乾为天", en: "Qian (The Creative)" },
      statement: { zh: "乾：元，亨，利，贞。", en: "Qian: sublime success, furthering through perseverance." },
      lines: {
        zh: ["初九：潜龙勿用。", "九二：见龙在田，利见大人。", "九三：君子终日乾乾，夕惕若厉，无咎。", "九四：或跃在渊，无咎。", "九五：飞龙在天，利见大人。", "上九：亢龙有悔。"],
        en: ["Nine at the beginning: Hidden dragon. Do not act.", "Nine in the second place: Dragon appearing in the field. It furthers one to see the great man.", "Nine in the third place: All day superior man is creative. At evening cautious, danger, no blame.", "Nine in the fourth place: Wavering flight over the depths. No blame.", "Nine in the fifth place: Flying dragon in the heavens. It furthers one to see the great man.", "Nine at the top: Arrogant dragon will have cause to repent."],
      },
    },
    { /* 2 坤为地 */
      name: { zh: "坤为地", en: "Kun (The Receptive)" },
      statement: { zh: "坤：元，亨，利牝马之贞。君子有攸往，先迷后得主，利。西南得朋，东北丧朋。安贞，吉。", en: "Kun: sublime success, furthering through the perseverance of a mare. The superior one sets forth; if one takes the lead, one goes astray; if one follows, one finds one's master. Friends in the southwest, loses friends in the northeast. Quiet perseverance brings good fortune." },
      lines: {
        zh: ["初六：履霜，坚冰至。", "六二：直，方，大，不习无不利。", "六三：含章可贞。或从王事，无成有终。", "六四：括囊，无咎无誉。", "六五：黄裳，元吉。", "上六：龙战于野，其血玄黄。"],
        en: ["Six at the beginning: Treading on hoarfrost — solid ice is not far.", "Six in the second place: Straight, square, great. Without purpose, yet nothing fails.", "Six in the third place: Hidden lines, capable of perseverance. If by chance in the service of a king, seek no glory, bring it to conclusion.", "Six in the fourth place: Tied-up sack. No blame, no praise.", "Six in the fifth place: Yellow lower garment. Supreme good fortune.", "Six at the top: Dragons fight in the meadow. Their blood is black and yellow."],
      },
    },
    { /* 3 水雷屯 */
      name: { zh: "水雷屯", en: "Zhun (Difficulty at the Beginning)" },
      statement: { zh: "屯：元，亨，利，贞。勿用有攸往，利建侯。", en: "Zhun: sublime success, furthering through perseverance. Do not undertake anything; it furthers to install helpers." },
      lines: {
        zh: ["初九：磐桓，利居贞，利建侯。", "六二：屯如邅如，乘马班如。匪寇婚媾，女子贞不字，十年乃字。", "六三：即鹿无虞，惟入于林中。君子几不如舍，往吝。", "六四：乘马班如，求婚媾，往吉，无不利。", "九五：屯其膏，小贞吉，大贞凶。", "上六：乘马班如，泣血涟如。"],
        en: ["Nine at the beginning: Hesitation and hindrance. It furthers one to remain persevering; it furthers one to install helpers.", "Six in the second place: Difficulties pile up. Horse and wagon part. Not a robber but a suitor. The girl is steadfast, not betrothed for ten years, then betrothed.", "Six in the third place: Hunting deer without a forester — only goes into the forest. The superior man sees the situation; better to give up. To go on brings humiliation.", "Six in the fourth place: Horse and wagon part. Seek union. To go brings good fortune; everything acts to further.", "Nine in the fifth place: Difficulties in blessing. A little perseverance brings good fortune; great perseverance, misfortune.", "Six at the top: Horse and wagon part. Bloody tears flow."],
      },
    },
    { /* 4 山水蒙 */
      name: { zh: "山水蒙", en: "Meng (Youthful Folly)" },
      statement: { zh: "蒙：亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。", en: "Meng: success. I do not seek the youthful fool; the fool seeks me. At the first oracle I inform; if he asks again, it is importunity — I give no further information. Perseverance furthers." },
      lines: {
        zh: ["初六：发蒙，利用刑人，用说桎梏。以往吝。", "九二：包蒙，吉。纳妇，吉。子克家。", "六三：勿用取女。见金夫，不有躬。无攸利。", "六四：困蒙，吝。", "六五：童蒙，吉。", "上九：击蒙，不利为寇，利御寇。"],
        en: ["Six at the beginning: To make a fool develop, it is useful to apply discipline. Fetters should be removed; to go on in this way brings humiliation.", "Nine in the second place: To bear with fools in kindness brings good fortune. To take a wife brings good fortune. The son is capable of taking charge of the household.", "Six in the third place: Take not such a bride. She sees a man of bronze and loses possession of herself. Nothing furthers.", "Six in the fourth place: Entangled folly brings humiliation.", "Six in the fifth place: Childlike folly brings good fortune.", "Nine at the top: In chastising folly it does not further to commit transgressions; it furthers to ward off transgressions."],
      },
    },
    { /* 5 水天需 */
      name: { zh: "水天需", en: "Xu (Waiting)" },
      statement: { zh: "需：有孚，光亨，贞吉。利涉大川。", en: "Xu: waiting. If you are sincere, there is light and success. Perseverance brings good fortune. It furthers one to cross the great water." },
      lines: {
        zh: ["初九：需于郊，利用恒，无咎。", "九二：需于沙，小有言，终吉。", "九三：需于泥，致寇至。", "六四：需于血，出自穴。", "九五：需于酒食，贞吉。", "上六：入于穴，有不速之客三人来，敬之终吉。"],
        en: ["Nine at the beginning: Waiting in the meadow. Constancy furthers; no blame.", "Nine in the second place: Waiting on the sand. Some words of discourse, but in the end good fortune.", "Nine in the third place: Waiting in the mud brings about the arrival of the enemy.", "Six in the fourth place: Waiting in blood. Get out of the pit.", "Nine in the fifth place: Waiting at meat and drink. Perseverance brings good fortune.", "Six at the top: One falls into the pit. Three uninvited guests arrive. Honor them, and in the end there will be good fortune."],
      },
    },
    { /* 6 天水讼 */
      name: { zh: "天水讼", en: "Song (Conflict)" },
      statement: { zh: "讼：有孚，窒惕，中吉，终凶。利见大人，不利涉大川。", en: "Song: if one is sincere and obstructed, a cautious halt halfway brings good fortune; going through to the end brings misfortune. It furthers one to see the great man. It does not further one to cross the great water." },
      lines: {
        zh: ["初六：不永所事，小有言，终吉。", "九二：不克讼，归而逋，其邑人三百户无眚。", "六三：食旧德，贞厉，终吉。或从王事，无成。", "九四：不克讼，复即命，渝，安贞吉。", "九五：讼，元吉。", "上九：或锡之鞶带，终朝三褫之。"],
        en: ["Six at the beginning: If one does not perpetuate the affair, there is a little gossip. In the end good fortune comes.", "Nine in the second place: One cannot engage in conflict. One returns home, gives way. The people of his town — three hundred households — remain free of guilt.", "Six in the third place: Nourished by ancient virtue. Perseverance brings danger, but in the end good fortune. If by chance in the service of a king, seek no accomplishment.", "Nine in the fourth place: Cannot win the conflict. One turns back, accepts fate, changes. Quiet perseverance brings good fortune.", "Nine in the fifth place: Conflict brings supreme good fortune.", "Nine at the top: Even if by chance a belt is bestowed, by morning's end it has been snatched away three times."],
      },
    },
    { /* 7 地水师 */
      name: { zh: "地水师", en: "Shi (The Army)" },
      statement: { zh: "师：贞，丈人吉，无咎。", en: "Shi: perseverance, and a strong man — good fortune, no blame." },
      lines: {
        zh: ["初六：师出以律，否臧凶。", "九二：在师中，吉，无咎，王三锡命。", "六三：师或舆尸，凶。", "六四：师左次，无咎。", "六五：田有禽，利执言，无咎。长子帅师，弟子舆尸，贞凶。", "上六：大君有命，开国承家，小人勿用。"],
        en: ["Six at the beginning: An army must set forth in proper order. Without order, misfortune.", "Nine in the second place: In the midst of the army. Good fortune, no blame. The king bestows triple commands.", "Six in the third place: Perchance the army carries corpses in the wagon. Misfortune.", "Six in the fourth place: The army retreats. No blame.", "Six in the fifth place: Game in the field — it furthers one to take a stand. No blame. The eldest son leads the army; the younger son transports corpses. Then perseverance brings misfortune.", "Six at the top: The great prince issues commands, founds states, awards fiefs. Inferior people should not be employed."],
      },
    },
    { /* 8 水地比 */
      name: { zh: "水地比", en: "Bi (Holding Together)" },
      statement: { zh: "比：吉。原筮，元永贞，无咎。不宁方来，后夫凶。", en: "Bi: good fortune. Inquire of the oracle again. Sublime, everlasting perseverance. No blame. Those who are uncertain gradually join. Whoever comes too late meets with misfortune." },
      lines: {
        zh: ["初六：有孚比之，无咎。有孚盈缶，终来有它，吉。", "六二：比之自内，贞吉。", "六三：比之匪人。", "六四：外比之，贞吉。", "九五：显比，王用三驱，失前禽。邑人不诫，吉。", "上六：比之无首，凶。"],
        en: ["Six at the beginning: Hold to him in truth and loyalty — no blame. Truth, like a full earthen bowl, draws from all sides good fortune in the end.", "Six in the second place: Hold to him inwardly. Perseverance brings good fortune.", "Six in the third place: One holds to inappropriate people.", "Six in the fourth place: Hold to him outwardly. Perseverance brings good fortune.", "Nine in the fifth place: Manifestation of holding together. The king uses beaters on three sides — the game before him is let go. The townspeople are not warned. Good fortune.", "Six at the top: He finds no head for holding together. Misfortune."],
      },
    },
    { /* 9 风天小畜 */
      name: { zh: "风天小畜", en: "Xiao Xu (The Taming Power of the Small)" },
      statement: { zh: "小畜：亨。密云不雨，自我西郊。", en: "Xiao Xu: success. Dense clouds, no rain from our western region." },
      lines: {
        zh: ["初九：复自道，何其咎，吉。", "九二：牵复，吉。", "九三：舆说辐，夫妻反目。", "六四：有孚，血去惕出，无咎。", "九五：有孚挛如，富以其邻。", "上九：既雨既处，尚德载，妇贞厉。月几望，君子征凶。"],
        en: ["Nine at the beginning: Return to the way. How could there be blame? Good fortune.", "Nine in the second place: One returns, drawn along by a team. Good fortune.", "Nine in the third place: The spokes burst out of the wagon wheels. Man and wife roll their eyes.", "Six in the fourth place: If you are sincere, blood vanishes and fear gives way. No blame.", "Nine in the fifth place: If you are sincere and loyally attached, you are rich in your neighbor.", "Nine at the top: The rain comes, there is rest. This is due to the lasting effect of character. Perseverance brings danger to the woman. The moon is nearly full. If the superior man sets forth, misfortune."],
      },
    },
    { /* 10 天泽履 */
      name: { zh: "天泽履", en: "Lü (Treading)" },
      statement: { zh: "履虎尾，不咥人，亨。", en: "Lü: treading upon the tail of the tiger. It does not bite the man. Success." },
      lines: {
        zh: ["初九：素履，往无咎。", "九二：履道坦坦，幽人贞吉。", "六三：眇能视，跛能履。履虎尾，咥人，凶。武人为于大君。", "九四：履虎尾，愬愬，终吉。", "九五：夬履，贞厉。", "上九：视履考祥，其旋元吉。"],
        en: ["Nine at the beginning: Simple conduct. Progress without blame.", "Nine in the second place: Treading a smooth, level course. Quiet perseverance of a lonely man brings good fortune.", "Six in the third place: A one-eyed man can see, a lame man can tread. He treads on the tiger's tail. The tiger bites the man. Misfortune. A warrior acts for a great prince.", "Nine in the fourth place: He treads on the tail of the tiger. Caution and circumspection lead ultimately to good fortune.", "Nine in the fifth place: Resolute conduct. Perseverance with awareness of danger.", "Nine at the top: Look to your conduct and weigh the favorable signs. When everything is fulfilled, supreme good fortune comes."],
      },
    },
    { /* 11 地天泰 */
      name: { zh: "地天泰", en: "Tai (Peace)" },
      statement: { zh: "泰：小往大来，吉，亨。", en: "Tai: the small departs, the great approaches. Good fortune, success." },
      lines: {
        zh: ["初九：拔茅茹，以其汇，征吉。", "九二：包荒，用冯河，不遐遗。朋亡，得尚于中行。", "九三：无平不陂，无往不复。艰贞无咎，勿恤其孚，于食有福。", "六四：翩翩，不富以其邻，不戒以孚。", "六五：帝乙归妹，以祉元吉。", "上六：城复于隍，勿用师，自邑告命。贞吝。"],
        en: ["Nine at the beginning: When ribbon grass is pulled up, the sod comes with it. Each according to his kind. Undertakings bring good fortune.", "Nine in the second place: Bearing with the wilderness, fording the river, not leaving the distant behind. Not considering one's followers. One may win the middle way.", "Nine in the third place: No plain not followed by a slope. No going without a return. Persevere in danger and there is no blame. Do not grieve over the trust; have joy in the food and drink.", "Six in the fourth place: Fluttering, not rich because of the neighbor. Warned, trusting, without restraint.", "Six in the fifth place: The sovereign Yi gives his daughter in marriage. This brings blessing and supreme good fortune.", "Six at the top: The wall falls back into the moat. Use no army now. Make your commands known within your own town. Perseverance becomes humiliating."],
      },
    },
    { /* 12 天地否 */
      name: { zh: "天地否", en: "Pi (Standstill)" },
      statement: { zh: "否之匪人，不利君子贞，大往小来。", en: "Pi: standstill — evil people do not further the perseverance of the superior man. The great departs, the small approaches." },
      lines: {
        zh: ["初六：拔茅茹，以其汇，贞吉，亨。", "六二：包承，小人吉，大人否，亨。", "六三：包羞。", "九四：有命无咎，畴离祉。", "九五：休否，大人吉。其亡其亡，系于苞桑。", "上九：倾否，先否后喜。"],
        en: ["Six at the beginning: When ribbon grass is pulled up, the sod comes with it. Each according to his kind. Perseverance brings good fortune and success.", "Six in the second place: They bear and endure. Good fortune for inferior people. The great man, set apart, succeeds.", "Six in the third place: They bear shame.", "Nine in the fourth place: He who acts at the command of the highest is without blame. Those of like mind partake of the blessing.", "Nine in the fifth place: Standstill is giving way. Good fortune for the great man. 'If it fails, it fails!' — bound to a clump of mulberry shoots.", "Nine at the top: The standstill comes to an end. First standstill, then joy."],
      },
    },
    { /* 13 天火同人 */
      name: { zh: "天火同人", en: "Tong Ren (Fellowship with Men)" },
      statement: { zh: "同人于野，亨。利涉大川，利君子贞。", en: "Tong Ren: fellowship with men in the open. Success. It furthers one to cross the great water. The perseverance of the superior man furthers." },
      lines: {
        zh: ["初九：同人于门，无咎。", "六二：同人于宗，吝。", "九三：伏戎于莽，升其高陵，三岁不兴。", "九四：乘其墉，弗克攻，吉。", "九五：同人，先号啕而后笑，大师克相遇。", "上九：同人于郊，无悔。"],
        en: ["Nine at the beginning: Fellowship with men at the gate. No blame.", "Six in the second place: Fellowship with men in the clan. Humiliation.", "Nine in the third place: He hides weapons in the thicket, climbs the high hill before him. For three years he does not rise up.", "Nine in the fourth place: He climbs the wall, cannot attack. Good fortune.", "Nine in the fifth place: Men bound in fellowship first weep and lament, but afterward they laugh. After great struggles they meet.", "Nine at the top: Fellowship with men in the meadow. No remorse."],
      },
    },
    { /* 14 火天大有 */
      name: { zh: "火天大有", en: "Da You (Possession in Great Measure)" },
      statement: { zh: "大有：元，亨。", en: "Da You: sublime success." },
      lines: {
        zh: ["初九：无交害，匪咎，艰则无咎。", "九二：大车以载，有攸往，无咎。", "九三：公用亨于天子，小人弗克。", "九四：匪其彭，无咎。", "六五：厥孚交如，威如，吉。", "上九：自天佑之，吉无不利。"],
        en: ["Nine at the beginning: No relationship with what is harmful — not blameworthy. If one remains conscious of difficulty, there is no blame.", "Nine in the second place: A big wagon for loading. One may undertake something; no blame.", "Nine in the third place: A prince offers it to the Son of Heaven. An inferior man cannot do this.", "Nine in the fourth place: He makes a difference between himself and his neighbor. No blame.", "Six in the fifth place: He whose truth is accessible, yet dignified, has good fortune.", "Nine at the top: Blessed by heaven. Good fortune. Nothing that does not further."],
      },
    },
    { /* 15 地山谦 */
      name: { zh: "地山谦", en: "Qian (Modesty)" },
      statement: { zh: "谦：亨，君子有终。", en: "Qian: success. The superior man brings things to completion." },
      lines: {
        zh: ["初六：谦谦君子，用涉大川，吉。", "六二：鸣谦，贞吉。", "九三：劳谦，君子有终，吉。", "六四：无不利，撝谦。", "六五：不富以其邻，利用侵伐，无不利。", "上六：鸣谦，利用行师，征邑国。"],
        en: ["Six at the beginning: A superior man modest about his modesty may cross the great water. Good fortune.", "Six in the second place: Modesty that comes to expression. Perseverance brings good fortune.", "Nine in the third place: A superior man of modesty and merit carries things through. Good fortune.", "Six in the fourth place: Nothing that would not further the furthering of modesty.", "Six in the fifth place: No boasting of wealth before one's neighbor. It is favorable to attack with force. Nothing that does not further.", "Six at the top: Modesty that comes to expression. It is favorable to set armies marching to chastise one's own city and one's own country."],
      },
    },
    { /* 16 雷地豫 */
      name: { zh: "雷地豫", en: "Yu (Enthusiasm)" },
      statement: { zh: "豫：利建侯行师。", en: "Yu: it furthers one to install helpers and to set armies marching." },
      lines: {
        zh: ["初六：鸣豫，凶。", "六二：介于石，不终日，贞吉。", "六三：盱豫悔。迟有悔。", "九四：由豫，大有得。勿疑。朋盍簪。", "六五：贞疾，恒不死。", "上六：冥豫，成有渝，无咎。"],
        en: ["Six at the beginning: Enthusiasm that expresses itself brings misfortune.", "Six in the second place: Firm as a rock. Not a whole day. Perseverance brings good fortune.", "Six in the third place: Enthusiasm that looks upward creates remorse. Hesitation brings remorse.", "Nine in the fourth place: The source of enthusiasm. Great achievement. Do not doubt. Friends gather as though fastened by a hair clasp.", "Six in the fifth place: Persistently ill, yet never dying.", "Six at the top: Deluded enthusiasm. But if after completion one changes, there is no blame."],
      },
    },
    { /* 17 泽雷随 */
      name: { zh: "泽雷随", en: "Sui (Following)" },
      statement: { zh: "随：元，亨，利，贞，无咎。", en: "Sui: following has supreme success. Perseverance furthers. No blame." },
      lines: {
        zh: ["初九：官有渝，贞吉。出门交有功。", "六二：系小子，失丈夫。", "六三：系丈夫，失小子。随有求得，利居贞。", "九四：随有获，贞凶。有孚在道，以明，何咎。", "九五：孚于嘉，吉。", "上六：拘系之，乃从维之。王用亨于西山。"],
        en: ["Nine at the beginning: The standard is changing. Perseverance brings good fortune. To go out of the door in company produces deeds.", "Six in the second place: If one clings to the little boy, one loses the strong man.", "Six in the third place: If one clings to the strong man, one loses the little boy. Through following one finds what one seeks. It furthers one to remain persevering.", "Nine in the fourth place: Following creates success. Perseverance brings misfortune. To go one's way with sincerity brings clarity. How could there be blame?", "Nine in the fifth place: Sincere in the good. Good fortune.", "Six at the top: He meets with firm allegiance and is still further bound. The king introduces him to the Western Mountain."],
      },
    },
    { /* 18 山风蛊 */
      name: { zh: "山风蛊", en: "Gu (Work on the Decayed)" },
      statement: { zh: "蛊：元，亨，利涉大川。先甲三日，后甲三日。", en: "Gu: sublime success. It furthers one to cross the great water. Three days before the beginning, three days after the beginning." },
      lines: {
        zh: ["初六：干父之蛊，有子，考无咎，厉终吉。", "九二：干母之蛊，不可贞。", "九三：干父之蛊，小有悔，无大咎。", "六四：裕父之蛊，往见吝。", "六五：干父之蛊，用誉。", "上九：不事王侯，高尚其事。"],
        en: ["Six at the beginning: Setting right what has been spoiled by the father. If there is a son, no blame rests on the departed father. Danger, but in the end good fortune.", "Nine in the second place: Setting right what has been spoiled by the mother. One must not be too persevering.", "Nine in the third place: Setting right what has been spoiled by the father. There will be a little remorse. No great blame.", "Six in the fourth place: Tolerating what has been spoiled by the father. In continuing one sees humiliation.", "Six in the fifth place: Setting right what has been spoiled by the father. One meets with praise.", "Nine at the top: He does not serve kings and princes. Sets himself higher in aim."],
      },
    },
    { /* 19 地泽临 */
      name: { zh: "地泽临", en: "Lin (Approach)" },
      statement: { zh: "临：元，亨，利，贞。至于八月有凶。", en: "Lin: approach has supreme success. Perseverance furthers. When the eighth month comes, there will be misfortune." },
      lines: {
        zh: ["初九：咸临，贞吉。", "九二：咸临，吉无不利。", "六三：甘临，无攸利。既忧之，无咎。", "六四：至临，无咎。", "六五：知临，大君之宜，吉。", "上六：敦临，吉无咎。"],
        en: ["Nine at the beginning: Joint approach. Perseverance brings good fortune.", "Nine in the second place: Joint approach. Good fortune. Everything furthers.", "Six in the third place: Pleasant approach. Nothing that would further. If one is induced to grieve over it, yet no blame.", "Six in the fourth place: Complete approach. No blame.", "Six in the fifth place: Wise approach. This is right for a great prince. Good fortune.", "Six at the top: Greathearted approach. Good fortune. No blame."],
      },
    },
    { /* 20 风地观 */
      name: { zh: "风地观", en: "Guan (Contemplation)" },
      statement: { zh: "观：盥而不荐，有孚颙若。", en: "Guan: the ablution has been made, but not yet the offering. Full of trust they look up to him." },
      lines: {
        zh: ["初六：童观，小人无咎，君子吝。", "六二：窥观，利女贞。", "六三：观我生，进退。", "六四：观国之光，利用宾于王。", "九五：观我生，君子无咎。", "上九：观其生，君子无咎。"],
        en: ["Six at the beginning: Boylike contemplation. For an inferior person, no blame. For a superior man, humiliation.", "Six in the second place: Contemplation through the crack of the door. Furthering for the perseverance of a woman.", "Six in the third place: Contemplation of my life decides the choice between advance and retreat.", "Six in the fourth place: Contemplation of the light of the kingdom. It furthers one to exert influence as the guest of a king.", "Nine in the fifth place: Contemplation of my life. The superior man is without blame.", "Nine at the top: Contemplation of his life. The superior man is without blame."],
      },
    },
    { /* 21 火雷噬嗑 */
      name: { zh: "火雷噬嗑", en: "Shi He (Biting Through)" },
      statement: { zh: "噬嗑：亨。利用狱。", en: "Shi He: biting through has success. It is favorable to let justice be administered." },
      lines: {
        zh: ["初九：屦校灭趾，无咎。", "六二：噬肤灭鼻，无咎。", "六三：噬腊肉，遇毒。小吝，无咎。", "九四：噬干胏，得金矢。利艰贞，吉。", "六五：噬干肉，得黄金。贞厉，无咎。", "上九：何校灭耳，凶。"],
        en: ["Nine at the beginning: His feet are fastened in the stocks so that his toes disappear. No blame.", "Six in the second place: Bites through tender meat so that his nose disappears. No blame.", "Six in the third place: Bites on old dried meat and strikes on something poisonous. Slight humiliation. No blame.", "Nine in the fourth place: Bites on dried gristly meat. Receives metal arrows. It is favorable to be mindful of difficulties and to be persevering.", "Six in the fifth place: Bites on dried lean meat. Receives yellow gold. Persevering awareness of danger. No blame.", "Nine at the top: His neck is fastened in the wooden cangue so that his ears disappear. Misfortune."],
      },
    },
    { /* 22 山火贲 */
      name: { zh: "山火贲", en: "Bi (Grace)" },
      statement: { zh: "贲：亨。小利有攸往。", en: "Bi: grace has success. In small matters it is favorable to undertake something." },
      lines: {
        zh: ["初九：贲其趾，舍车而徒。", "六二：贲其须。", "九三：贲如濡如，永贞吉。", "六四：贲如皤如，白马翰如。匪寇婚媾。", "六五：贲于丘园，束帛戋戋，吝，终吉。", "上九：白贲，无咎。"],
        en: ["Nine at the beginning: He lends grace to his toes, leaves the carriage and walks.", "Six in the second place: He adorns his beard.", "Nine in the third place: Graceful and moist. Constant perseverance brings good fortune.", "Six in the fourth place: Grace or simplicity? A white horse comes as if on wings. He is not a robber, he will woo at the right time.", "Six in the fifth place: Grace in hills and gardens. The roll of silk is meager and small. Humiliation, but in the end good fortune.", "Nine at the top: Simple grace. No blame."],
      },
    },
    { /* 23 山地剥 */
      name: { zh: "山地剥", en: "Bo (Splitting Apart)" },
      statement: { zh: "剥：不利有攸往。", en: "Bo: it does not further one to go anywhere." },
      lines: {
        zh: ["初六：剥床以足，蔑贞凶。", "六二：剥床以辨，蔑贞凶。", "六三：剥之，无咎。", "六四：剥床以肤，凶。", "六五：贯鱼，以宫人宠，无不利。", "上九：硕果不食，君子得舆，小人剥庐。"],
        en: ["Six at the beginning: The leg of the bed is split. Those who persevere are destroyed. Misfortune.", "Six in the second place: The bed is split at the edge. Those who persevere are destroyed. Misfortune.", "Six in the third place: He splits with them. No blame.", "Six in the fourth place: The bed is split up to the skin. Misfortune.", "Six in the fifth place: A shoal of fishes. Favor comes through the court ladies. Everything acts to further.", "Nine at the top: There is a large fruit still uneaten. The superior man receives a carriage. The inferior man's hut is split apart."],
      },
    },
    { /* 24 地雷复 */
      name: { zh: "地雷复", en: "Fu (Return)" },
      statement: { zh: "复：亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。", en: "Fu: return. Success. Going out, coming in without error. Friends come without blame. Seven days is the cycle that returns. It furthers one to go somewhere." },
      lines: {
        zh: ["初九：不远复，无祗悔，元吉。", "六二：休复，吉。", "六三：频复，厉无咎。", "六四：中行独复。", "六五：敦复，无悔。", "上六：迷复，凶，有灾眚。用行师，终有大败，以其国君，凶。至于十年，不克征。"],
        en: ["Nine at the beginning: Return from a short distance. No need for remorse. Great good fortune.", "Six in the second place: Quiet return. Good fortune.", "Six in the third place: Repeated return. Danger. No blame.", "Six in the fourth place: Walking in the midst of others, one returns alone.", "Six in the fifth place: Noblehearted return. No remorse.", "Six at the top: Missing the return. Misfortune. Misfortune from within and without. If one sets armies in motion, in the end there is a great defeat, disastrous for the ruler. For ten years one is not able to attack again."],
      },
    },
    { /* 25 天雷无妄 */
      name: { zh: "天雷无妄", en: "Wu Wang (Innocence)" },
      statement: { zh: "无妄：元，亨，利，贞。其匪正有眚，不利有攸往。", en: "Wu Wang: supreme success. Perseverance furthers. If someone is not as he should be, he has misfortune. It does not further one to undertake anything." },
      lines: {
        zh: ["初九：无妄，往吉。", "六二：不耕获，不菑畲，则利有攸往。", "六三：无妄之灾，或系之牛，行人之得，邑人之灾。", "九四：可贞，无咎。", "九五：无妄之疾，勿药有喜。", "上九：无妄，行有眚，无攸利。"],
        en: ["Nine at the beginning: Innocent behavior brings good fortune.", "Six in the second place: If one does not count on the harvest while plowing, nor on the use of the ground while clearing it, it furthers one to undertake something.", "Six in the third place: Undeserved misfortune. The cow that was tethered by someone is the wanderer's gain, the citizen's loss.", "Nine in the fourth place: He who can be persevering remains without blame.", "Nine in the fifth place: Use no medicine in an illness incurred through no fault of your own. It will pass of itself.", "Nine at the top: Innocent action brings misfortune. Nothing furthers."],
      },
    },
    { /* 26 山天大畜 */
      name: { zh: "山天大畜", en: "Da Xu (The Taming Power of the Great)" },
      statement: { zh: "大畜：利贞。不家食，吉。利涉大川。", en: "Da Xu: perseverance furthers. Not eating at home brings good fortune. It furthers one to cross the great water." },
      lines: {
        zh: ["初九：有厉，利已。", "九二：舆说輹。", "九三：良马逐，利艰贞。曰闲舆卫，利有攸往。", "六四：童牛之牿，元吉。", "六五：豮豕之牙，吉。", "上九：何天之衢，亨。"],
        en: ["Nine at the beginning: Danger. It is favorable to desist.", "Nine in the second place: The axletrees are taken from the wagon.", "Nine in the third place: A good horse that follows others. Awareness of danger, with perseverance, furthers. Practice chariot driving and armed defense daily. It furthers one to have somewhere to go.", "Six in the fourth place: The headboard of a young bull. Great good fortune.", "Six in the fifth place: The tusk of a gelded boar. Good fortune.", "Nine at the top: One attains the way of heaven. Success."],
      },
    },
    { /* 27 山雷颐 */
      name: { zh: "山雷颐", en: "Yi (The Corners of the Mouth / Nourishment)" },
      statement: { zh: "颐：贞吉。观颐，自求口实。", en: "Yi: perseverance brings good fortune. Pay heed to the providing of nourishment and what a man seeks to fill his mouth with." },
      lines: {
        zh: ["初九：舍尔灵龟，观我朵颐，凶。", "六二：颠颐，拂经于丘颐，征凶。", "六三：拂颐，贞凶。十年勿用，无攸利。", "六四：颠颐，吉。虎视眈眈，其欲逐逐，无咎。", "六五：拂经，居贞吉，不可涉大川。", "上九：由颐，厉吉，利涉大川。"],
        en: ["Nine at the beginning: You let your magic tortoise go and look at me with the corners of your mouth drooping. Misfortune.", "Six in the second place: Turning to the summit for nourishment, deviating from the path to seek nourishment from the hill. Continuing brings misfortune.", "Six in the third place: Turning away from nourishment. Perseverance brings misfortune. Do not act thus for ten years. Nothing serves to further.", "Six in the fourth place: Turning to the summit for nourishment brings good fortune. Spying about with sharp eyes like a tiger pursuing his desire. No blame.", "Six in the fifth place: Turning away from the path. To remain persevering brings good fortune. One should not cross the great water.", "Nine at the top: The source of nourishment. Awareness of danger brings good fortune. It furthers one to cross the great water."],
      },
    },
    { /* 28 泽风大过 */
      name: { zh: "泽风大过", en: "Da Guo (Preponderance of the Great)" },
      statement: { zh: "大过：栋桡，利有攸往，亨。", en: "Da Guo: preponderance of the great. The ridgepole sags to the breaking point. It furthers one to have somewhere to go. Success." },
      lines: {
        zh: ["初六：藉用白茅，无咎。", "九二：枯杨生稊，老夫得其女妻，无不利。", "九三：栋桡，凶。", "九四：栋隆，吉，有它吝。", "九五：枯杨生华，老妇得其士夫，无咎无誉。", "上六：过涉灭顶，凶，无咎。"],
        en: ["Six at the beginning: To spread white rushes underneath. No blame.", "Nine in the second place: A dry poplar sprouts at the root. An older man takes a young wife. Everything furthers.", "Nine in the third place: The ridgepole sags to the breaking point. Misfortune.", "Nine in the fourth place: The ridgepole is braced. Good fortune. If there are ulterior motives, it is humiliating.", "Nine in the fifth place: A withered poplar puts forth flowers. An older woman takes a husband. No blame, no praise.", "Six at the top: To go one's way with empty hands is misfortune, yet no blame."],
      },
    },
    { /* 29 坎为水 */
      name: { zh: "坎为水", en: "Kan (The Abysmal)" },
      statement: { zh: "习坎：有孚，维心亨，行有尚。", en: "Kan: the abysmal repeated. If you are sincere, you have success in your heart, and whatever you do succeeds." },
      lines: {
        zh: ["初六：习坎，入于坎窞，凶。", "九二：坎有险，求小得。", "六三：来之坎坎，险且枕，入于坎窞，勿用。", "六四：樽酒簋贰，用缶，纳约自牖，终无咎。", "九五：坎不盈，祗既平，无咎。", "上六：系用徽纆，寘于丛棘，三岁不得，凶。"],
        en: ["Six at the beginning: Repeated abysmal. In the abyss one falls into a pit. Misfortune.", "Nine in the second place: The abyss is dangerous. One should strive to attain small things only.", "Six in the third place: Forward and backward, abyss on abyss. In danger like this, pause at first and wait, otherwise you will fall into the pit. Do not act.", "Six in the fourth place: A jug of wine, a bowl of rice with it; earthen vessels simply handed in through the window. Certainly no blame in this.", "Nine in the fifth place: The abyss is not filled to overflowing, it is filled only to the rim. No blame.", "Six at the top: Bound with cords and ropes, shut in between thorn-hedged prison walls. For three years one does not find the way. Misfortune."],
      },
    },
    { /* 30 离为火 */
      name: { zh: "离为火", en: "Li (The Clinging)" },
      statement: { zh: "离：利贞，亨。畜牝牛，吉。", en: "Li: the clinging. Perseverance furthers. It brings success. Care of the cow brings good fortune." },
      lines: {
        zh: ["初九：履错然，敬之，无咎。", "六二：黄离，元吉。", "九三：日昃之离，不鼓缶而歌，则大耋之嗟，凶。", "九四：突如其来如，焚如，死如，弃如。", "六五：出涕沱若，戚嗟若，吉。", "上九：王用出征，有嘉折首，获匪其丑，无咎。"],
        en: ["Nine at the beginning: The footprints run crisscross. If one is seriously intent, no blame.", "Six in the second place: Yellow light. Supreme good fortune.", "Nine in the third place: In the light of the setting sun, men either beat the pot and sing or loudly bewail the approach of old age. Misfortune.", "Nine in the fourth place: Its coming is sudden; it flames up, dies down, is thrown away.", "Six in the fifth place: Tears in floods, sighing and lamenting. Good fortune.", "Nine at the top: The king uses him to chastise. There is best reason to behead the leaders and take captive the followers. No blame."],
      },
    },
    { /* 31 泽山咸 */
      name: { zh: "泽山咸", en: "Xian (Influence)" },
      statement: { zh: "咸：亨，利贞，取女吉。", en: "Xian: influence. Success. Perseverance furthers. To take a maiden to wife brings good fortune." },
      lines: {
        zh: ["初六：咸其拇。", "六二：咸其腓，凶，居吉。", "九三：咸其股，执其随，往吝。", "九四：贞吉悔亡，憧憧往来，朋从尔思。", "九五：咸其脢，无悔。", "上六：咸其辅颊舌。"],
        en: ["Six at the beginning: Influence shows itself in the big toe.", "Six in the second place: Influence shows itself in the calves of the legs. Misfortune. Tarrying brings good fortune.", "Nine in the third place: Influence shows itself in the thighs. Holds to that which follows him. To continue is humiliating.", "Nine in the fourth place: Perseverance brings good fortune. Remorse disappears. If a person is agitated in mind, he follows along with what he thinks; friends follow your thoughts.", "Nine in the fifth place: The influence shows itself in the back of the neck. No remorse.", "Six at the top: The influence shows itself in the jaws, cheeks, and tongue."],
      },
    },
    { /* 32 雷风恒 */
      name: { zh: "雷风恒", en: "Heng (Duration)" },
      statement: { zh: "恒：亨，无咎，利贞，利有攸往。", en: "Heng: duration. Success. No blame. Perseverance furthers. It furthers one to have somewhere to go." },
      lines: {
        zh: ["初六：浚恒，贞凶，无攸利。", "九二：悔亡。", "九三：不恒其德，或承之羞，贞吝。", "九四：田无禽。", "六五：恒其德，贞，妇人吉，夫子凶。", "上六：振恒，凶。"],
        en: ["Six at the beginning: Seeking duration too hastily brings misfortune. Nothing that would further.", "Nine in the second place: Remorse disappears.", "Nine in the third place: He who does not give duration to his character meets with disgrace. Persistent humiliation.", "Nine in the fourth place: No game in the field.", "Six in the fifth place: Giving duration to one's character through perseverance. For a woman good fortune. For a man misfortune.", "Six at the top: Restlessness as a lasting condition brings misfortune."],
      },
    },
    { /* 33 天山遁 */
      name: { zh: "天山遁", en: "Dun (Retreat)" },
      statement: { zh: "遁：亨，小利贞。", en: "Dun: retreat. Success. In what is small, perseverance furthers." },
      lines: {
        zh: ["初六：遁尾，厉，勿用有攸往。", "六二：执之用黄牛之革，莫之胜说。", "九三：系遁，有疾厉，畜臣妾吉。", "九四：好遁，君子吉，小人否。", "九五：嘉遁，贞吉。", "上九：肥遁，无不利。"],
        en: ["Six at the beginning: At the tail in retreat. Danger. Do not undertake anything.", "Six in the second place: He holds him fast with yellow oxhide, and no one can tear him loose.", "Nine in the third place: A halted retreat is nerve-wracking and dangerous. To retain people as men- and maidservants brings good fortune.", "Nine in the fourth place: Voluntary retreat brings good fortune to the superior man and downfall to the inferior man.", "Nine in the fifth place: Friendly retreat. Perseverance brings good fortune.", "Nine at the top: Cheerful retreat. Everything serves to further."],
      },
    },
    { /* 34 雷天大壮 */
      name: { zh: "雷天大壮", en: "Da Zhuang (The Power of the Great)" },
      statement: { zh: "大壮：利贞。", en: "Da Zhuang: the power of the great. Perseverance furthers." },
      lines: {
        zh: ["初九：壮于趾，征凶，有孚。", "九二：贞吉。", "九三：小人用壮，君子用罔，贞厉。羝羊触藩，羸其角。", "九四：贞吉悔亡，藩决不羸，壮于大舆之輹。", "六五：丧羊于易，无悔。", "上六：羝羊触藩，不能退，不能遂，无攸利，艰则吉。"],
        en: ["Nine at the beginning: Power in the toes. Continuing brings misfortune. Remain sincere.", "Nine in the second place: Perseverance brings good fortune.", "Nine in the third place: The inferior man works through power. The superior man does not act thus. To continue is dangerous. A goat butts against a hedge and gets its horns entangled.", "Nine in the fourth place: Perseverance brings good fortune. Remorse disappears. The hedge opens; there is no entanglement. Power depends upon the axle of a big wagon.", "Six in the fifth place: Loses the goat with ease. No remorse.", "Six at the top: A goat butts against a hedge. It cannot go backward, cannot go forward. Nothing serves to further. If one notes the difficulty, this brings good fortune."],
      },
    },
    { /* 35 火地晋 */
      name: { zh: "火地晋", en: "Jin (Progress)" },
      statement: { zh: "晋：康侯用锡马蕃庶，昼日三接。", en: "Jin: the powerful prince is honored with horses in large numbers. In a single day he is granted audience three times." },
      lines: {
        zh: ["初六：晋如摧如，贞吉。罔孚，裕无咎。", "六二：晋如愁如，贞吉。受兹介福，于其王母。", "六三：众允，悔亡。", "九四：晋如鼫鼠，贞厉。", "六五：悔亡，失得勿恤，往吉无不利。", "上九：晋其角，维用伐邑，厉吉无咎，贞吝。"],
        en: ["Six at the beginning: Progressing but turned back. Perseverance brings good fortune. If one meets with no confidence, one should remain calm. No mistake.", "Six in the second place: Progressing but in sorrow. Perseverance brings good fortune. Then one obtains great happiness from one's ancestress.", "Six in the third place: All are in accord. Remorse disappears.", "Nine in the fourth place: Progress like a hamster. Perseverance brings danger.", "Six in the fifth place: Remorse disappears. Take not gain and loss to heart. Undertakings bring good fortune. Everything serves to further.", "Nine at the top: Making progress with the horns is permissible only for the purpose of punishing one's own city. Perseverance brings danger, yet good fortune. But if one takes to complaisant words, humiliation."],
      },
    },
    { /* 36 地火明夷 */
      name: { zh: "地火明夷", en: "Ming Yi (Darkening of the Light)" },
      statement: { zh: "明夷：利艰贞。", en: "Ming Yi: in adversity it furthers one to be persevering." },
      lines: {
        zh: ["初九：明夷于飞，垂其翼。君子于行，三日不食，有攸往，主人有言。", "六二：明夷，夷于左股，用拯马壮，吉。", "九三：明夷于南狩，得其大首，不可疾贞。", "六四：入于左腹，获明夷之心，于出门庭。", "六五：箕子之明夷，利贞。", "上六：不明晦，初登于天，后入于地。"],
        en: ["Nine at the beginning: Darkening of the light during flight. He lowers his wings. The superior man does not eat for three days on his wanderings, but he has somewhere to go. The host has occasion to gossip about him.", "Six in the second place: Darkening of the light injures him in the left thigh. He gives aid with the strength of a horse. Good fortune.", "Nine in the third place: Darkening of the light during the hunt in the south. Their great leader is captured. One must not expect perseverance too soon.", "Six in the fourth place: He penetrates the left side of the belly. One gets to the very heart of the darkening of the light, and leaves gate and courtyard.", "Six in the fifth place: Darkening of the light as with Ji Zi. Perseverance furthers.", "Six at the top: Not light but darkness. First he climbed up to heaven, then he plunged into the depths of the earth."],
      },
    },
    { /* 37 风火家人 */
      name: { zh: "风火家人", en: "Jia Ren (The Family)" },
      statement: { zh: "家人：利女贞。", en: "Jia Ren: the family shows the perserverance of a woman furthers." },
      lines: {
        zh: ["初九：闲有家，悔亡。", "六二：无攸遂，在中馈，贞吉。", "九三：家人嗃嗃，悔厉吉。妇子嘻嘻，终吝。", "六四：富家，大吉。", "九五：王假有家，勿恤吉。", "上九：有孚威如，终吉。"],
        en: ["Nine at the beginning: Firm seclusion within the family. Remorse disappears.", "Six in the second place: She should not follow her whims. She must attend within to the food. Perseverance brings good fortune.", "Nine in the third place: When tempers flare up in the family, too great severity brings remorse. Good fortune nonetheless. When woman and child dally, humiliation.", "Six in the fourth place: She is the treasure of the house. Great good fortune.", "Nine in the fifth place: As a king he approaches his family. Fear not. Good fortune.", "Nine at the top: He possesses authority, yet has dignity. In the end good fortune comes."],
      },
    },
    { /* 38 火泽睽 */
      name: { zh: "火泽睽", en: "Kui (Opposition)" },
      statement: { zh: "睽：小事吉。", en: "Kui: in small matters good fortune." },
      lines: {
        zh: ["初九：悔亡。丧马勿逐，自复。见恶人，无咎。", "九二：遇主于巷，无咎。", "六三：见舆曳，其牛掣，其人天且劓。无初有终。", "九四：睽孤，遇元夫，交孚，厉无咎。", "六五：悔亡，厥宗噬肤，往何咎。", "上九：睽孤，见豕负涂，载鬼一车，先张之弧，后说之弧。匪寇婚媾，往遇雨则吉。"],
        en: ["Nine at the beginning: Remorse disappears. If you lose your horse, do not run after it; it will come back of its own accord. When you see evil people, guard yourself against mistakes.", "Nine in the second place: One meets his lord in a narrow street. No blame.", "Six in the third place: One sees the wagon dragged back, the oxen halted, a man's hair and nose cut off. Not a good beginning, but a good end.", "Nine in the fourth place: Isolated through opposition, one meets a like-minded man with whom one can associate in good faith. Despite the danger, no blame.", "Six in the fifth place: Remorse disappears. Bite through the skin of his own clan. If one goes to them, how could it be a mistake?", "Nine at the top: Isolated through opposition, one sees one's counterpart as a pig covered with dirt, as a wagon full of devils. First one draws the bow against him, then one lays it aside. He is not a robber, he will woo at the right time. As one goes, rain falls; then good fortune comes."],
      },
    },
    { /* 39 水山蹇 */
      name: { zh: "水山蹇", en: "Jian (Obstruction)" },
      statement: { zh: "蹇：利西南，不利东北。利见大人，贞吉。", en: "Jian: obstruction. The southwest furthers. The northeast does not further. It furthers one to see the great man. Perseverance brings good fortune." },
      lines: {
        zh: ["初六：往蹇，来誉。", "六二：王臣蹇蹇，匪躬之故。", "九三：往蹇来反。", "六四：往蹇来连。", "九五：大蹇朋来。", "上六：往蹇来硕，吉，利见大人。"],
        en: ["Six at the beginning: Going leads to obstructions, coming meets with praise.", "Six in the second place: The king's servant is beset by obstruction upon obstruction, but it is not his own fault.", "Nine in the third place: Going leads to obstructions; hence he comes back.", "Six in the fourth place: Going leads to obstructions, coming leads to union.", "Nine in the fifth place: In the midst of the greatest obstructions, friends come.", "Six at the top: Going leads to obstructions, coming leads to great good fortune. It furthers one to see the great man."],
      },
    },
    { /* 40 雷水解 */
      name: { zh: "雷水解", en: "Xie (Deliverance)" },
      statement: { zh: "解：利西南，无所往，其来复吉。有攸往，夙吉。", en: "Xie: deliverance. The southwest furthers. If there is no longer anything where one has to go, return brings good fortune. If there is still something where one has to go, hastening brings good fortune." },
      lines: {
        zh: ["初六：无咎。", "九二：田获三狐，得黄矢，贞吉。", "六三：负且乘，致寇至，贞吝。", "九四：解而拇，朋至斯孚。", "六五：君子维有解，吉。有孚于小人。", "上六：公用射隼于高墉之上，获之，无不利。"],
        en: ["Six at the beginning: Without blame.", "Nine in the second place: One kills three foxes in the field and receives a yellow arrow. Perseverance brings good fortune.", "Six in the third place: Carries a burden on his back, rides in a carriage — thereby draws robbers near. Perseverance, to continue, brings humiliation.", "Nine in the fourth place: Deliver yourself from your great toe. Then the companion comes, and him you can trust.", "Six in the fifth place: If only the superior man can deliver himself, it brings good fortune. Thus he proves to inferior people that he is in earnest.", "Six at the top: The prince shoots at a hawk on a high wall. He kills it. Everything serves to further."],
      },
    },
    { /* 41 山泽损 */
      name: { zh: "山泽损", en: "Sun (Decrease)" },
      statement: { zh: "损：有孚，元吉，无咎，可贞，利有攸往。曷之用，二簋可用享。", en: "Sun: decrease combined with sincerity brings about supreme good fortune without blame. One can be persevering in this. It furthers one to undertake something. How is this to be carried out? Two small bowls may be used for the sacrifice." },
      lines: {
        zh: ["初九：已事遄往，无咎，酌损之。", "九二：利贞，征凶，弗损益之。", "六三：三人行，则损一人。一人行，则得其友。", "六四：损其疾，使遄有喜，无咎。", "六五：或益之十朋之龟，弗克违，元吉。", "上九：弗损益之，无咎，贞吉。利有攸往，得臣无家。"],
        en: ["Nine at the beginning: Going quickly when one's tasks are finished is without blame. But one must reflect on how much one may decrease others.", "Nine in the second place: Perseverance furthers. To undertake something brings misfortune. Without decreasing oneself, one is able to bring increase to others.", "Six in the third place: When three people journey together, their number decreases by one. When one man journeys alone, he finds a companion.", "Six in the fourth place: If a man decreases his faults, it makes the other hasten and come. There is no blame in this.", "Six in the fifth place: Someone does indeed increase him. Ten pairs of tortoises can oppose it. Supreme good fortune.", "Nine at the top: If one is increased without depriving others, there is no blame. Perseverance brings good fortune. It furthers one to undertake something. One obtains servants, but no longer has a separate home."],
      },
    },
    { /* 42 风雷益 */
      name: { zh: "风雷益", en: "Yi (Increase)" },
      statement: { zh: "益：利有攸往，利涉大川。", en: "Yi: it furthers one to undertake something. It furthers one to cross the great water." },
      lines: {
        zh: ["初九：利用为大作，元吉，无咎。", "六二：或益之十朋之龟，弗克违，永贞吉。王用享于帝，吉。", "六三：益之用凶事，无咎。有孚中行，告公用圭。", "六四：中行，告公从。利用为依迁国。", "九五：有孚惠心，勿问元吉。有孚惠我德。", "上九：莫益之，或击之，立心勿恒，凶。"],
        en: ["Nine at the beginning: It is favorable to undertake great things. Supreme good fortune. No blame.", "Six in the second place: Someone does indeed increase him; ten pairs of tortoises can oppose it. Constant perseverance brings good fortune. The king presents him before God. Good fortune.", "Six in the third place: One is enriched through unfortunate events. No blame, if you are sincere and walk in the middle, and report with a seal to the prince.", "Six in the fourth place: If you walk in the middle and report to the prince, he will follow. It is favorable to use this as a move in removing the capital.", "Nine in the fifth place: If in truth you have a kind heart, ask not. Supreme good fortune. Truly, kindness will be rewarded.", "Nine at the top: If one is not increased, someone strikes him. He does not persevere in his heart. Misfortune."],
      },
    },
    { /* 43 泽天夬 */
      name: { zh: "泽天夬", en: "Guai (Breakthrough)" },
      statement: { zh: "夬：扬于王庭，孚号有厉。告自邑，不利即戎，利有攸往。", en: "Guai: resoluteness. One must resolutely make the matter known at the court of the king. It must be announced truthfully. Danger. It is necessary to notify one's own city. It does not further one to resort to arms. It furthers one to undertake something." },
      lines: {
        zh: ["初九：壮于前趾，往不胜为咎。", "九二：惕号，莫夜有戎，勿恤。", "九三：壮于頄，有凶。君子夬夬，独行遇雨，若濡有愠，无咎。", "九四：臀无肤，其行次且。牵羊悔亡，闻言不信。", "九五：苋陆夬夬，中行无咎。", "上六：无号，终有凶。"],
        en: ["Nine at the beginning: Mighty in the forward-striding toes. When one goes and is not equal to the task, one makes a mistake.", "Nine in the second place: A cry of alarm. Arms at evening and at night. Fear nothing.", "Nine in the third place: To be powerful in the cheekbones brings misfortune. The superior man is firmly resolved. He walks alone and is caught in the rain. He is bespattered, and people murmur against him. No blame.", "Nine in the fourth place: There is no skin on his thighs, and walking comes hard. If a man were to let himself be led like a sheep, remorse would disappear. But if these words are heard they will not be believed.", "Nine in the fifth place: In dealing with weeds, firm resolution is necessary. Walking in the middle remains free of blame.", "Six at the top: No cry. In the end misfortune comes."],
      },
    },
    { /* 44 天风姤 */
      name: { zh: "天风姤", en: "Gou (Coming to Meet)" },
      statement: { zh: "姤：女壮，勿用取女。", en: "Gou: coming to meet. The maiden is powerful. One should not marry such a maiden." },
      lines: {
        zh: ["初六：系于金柅，贞吉。有攸往，见凶。羸豕孚蹢躅。", "九二：包有鱼，无咎，不利宾。", "九三：臀无肤，其行次且，厉，无大咎。", "九四：包无鱼，起凶。", "九五：以杞包瓜，含章，有陨自天。", "上九：姤其角，吝，无咎。"],
        en: ["Six at the beginning: It must be checked with a brake of bronze. Perseverance brings good fortune. If one goes, one meets with misfortune. Even a lean pig has it in him to rage about.", "Nine in the second place: There is a fish in the tank. No blame. Does not further guests.", "Nine in the third place: There is no skin on his thighs, and walking comes hard. Danger. No great mistake.", "Nine in the fourth place: No fish in the tank. This leads to misfortune.", "Nine in the fifth place: A melon covered with willow leaves. Hidden lines. Drop comes down from heaven.", "Nine at the top: He comes to meet with his horns. Humiliation. No blame."],
      },
    },
    { /* 45 泽地萃 */
      name: { zh: "泽地萃", en: "Cui (Gathering Together)" },
      statement: { zh: "萃：亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。", en: "Cui: gathering together. Success. The king approaches his temple. It furthers one to see the great man. This brings success. Perseverance furthers. To bring great offerings creates good fortune. It furthers one to undertake something." },
      lines: {
        zh: ["初六：有孚不终，乃乱乃萃。若号，一握为笑，勿恤，往无咎。", "六二：引吉，无咎，孚乃利用禴。", "六三：萃如嗟如，无攸利。往无咎，小吝。", "九四：大吉，无咎。", "九五：萃有位，无咎。匪孚，元永贞，悔亡。", "上六：赍咨涕洟，无咎。"],
        en: ["Six at the beginning: If you are sincere, but not to the end, there will be sometimes confusion, sometimes gathering together. If you call out, then after one grasp of the hand you can laugh again. Have no fear. Going is without blame.", "Six in the second place: Letting oneself be drawn brings good fortune and remains without blame. If one is sincere, it furthers one to bring even a small offering.", "Six in the third place: Gathering together amid sighs. Nothing serves to further. Going is without blame, slight humiliation.", "Nine in the fourth place: Great good fortune. No blame.", "Nine in the fifth place: If in gathering together one has position, no blame. If there are some who are not yet sincerely in the work, sublime perseverance is needed. Then remorse disappears.", "Six at the top: Sighing, lamenting, and weeping. Yet no blame."],
      },
    },
    { /* 46 地风升 */
      name: { zh: "地风升", en: "Sheng (Pushing Upward)" },
      statement: { zh: "升：元亨，用见大人，勿恤，南征吉。", en: "Sheng: pushing upward has supreme success. One must see the great man. Fear not. Departure toward the south brings good fortune." },
      lines: {
        zh: ["初六：允升，大吉。", "九二：孚乃利用禴，无咎。", "九三：升虚邑。", "六四：王用亨于岐山，吉无咎。", "六五：贞吉，升阶。", "上六：冥升，利于不息之贞。"],
        en: ["Six at the beginning: Pushing upward that meets with confidence brings great good fortune.", "Nine in the second place: If one is sincere, it furthers one to bring even a small offering. No blame.", "Nine in the third place: One pushes upward into an empty city.", "Six in the fourth place: The king offers him Mount Qi. Good fortune. No blame.", "Six in the fifth place: Perseverance brings good fortune. One pushes upward by degrees.", "Six at the top: Pushing upward in darkness. It furthers one to be unremittingly persevering."],
      },
    },
    { /* 47 泽水困 */
      name: { zh: "泽水困", en: "Kun (Oppression / Exhaustion)" },
      statement: { zh: "困：亨，贞，大人吉，无咎。有言不信。", en: "Kun: oppression, exhaustion. Success. Perseverance. The great man brings about good fortune. No blame. When one has something to say, it is not believed." },
      lines: {
        zh: ["初六：臀困于株木，入于幽谷，三岁不觌。", "九二：困于酒食，朱绂方来，利用享祀，征凶，无咎。", "六三：困于石，据于蒺藜，入于其宫，不见其妻，凶。", "九四：来徐徐，困于金车，吝，有终。", "九五：劓刖，困于赤绂，乃徐有说，利用祭祀。", "上六：困于葛藟，于臲卼，曰动悔，有悔，征吉。"],
        en: ["Six at the beginning: One sits oppressed under a bare tree, and strays into a gloomy valley. For three years one sees nothing.", "Nine in the second place: One is oppressed while at meat and drink. The man with the scarlet kneebands is coming. It furthers one to offer sacrifice. To set forth brings misfortune. No blame.", "Six in the third place: A man permits himself to be oppressed by stone, and leans on thorns and thistles. He enters his house and does not see his wife. Misfortune.", "Nine in the fourth place: He comes very quietly, oppressed in a golden carriage. Humiliation, but an end is reached.", "Nine in the fifth place: His nose and feet are cut off. Oppression at the hands of the man with the purple kneebands. Joy comes softly. It furthers one to make offerings.", "Six at the top: He is oppressed by creeping vines. He moves uncertainly and says, 'Movement brings remorse.' If one feels remorse over this and makes a start, good fortune comes."],
      },
    },
    { /* 48 水风井 */
      name: { zh: "水风井", en: "Jing (The Well)" },
      statement: { zh: "井：改邑不改井，无丧无得。往来井井。汔至，亦未繘井，羸其瓶，凶。", en: "Jing: the town may be changed, but the well cannot be changed. It neither decreases nor increases. They come and go and draw from the well. If one gets down almost to the water and the rope does not go all the way, or the jug breaks, it brings misfortune." },
      lines: {
        zh: ["初六：井泥不食，旧井无禽。", "九二：井谷射鲋，瓮敝漏。", "九三：井渫不食，为我心恻，可用汲。王明，并受其福。", "六四：井甃，无咎。", "九五：井冽寒泉食。", "上六：井收勿幕，有孚元吉。"],
        en: ["Six at the beginning: One does not drink the mud of the well. No animals come to an old well.", "Nine in the second place: At the wellhole one shoots fishes. The jug is broken and leaks.", "Nine in the third place: The well is cleaned, but no one drinks from it. This is my heart's sorrow, for one might draw from it. If the king were clear-minded, good fortune might be shared in common.", "Six in the fourth place: The well is being lined. No blame.", "Nine in the fifth place: In the well there is a clear, cold spring from which one can drink.", "Six at the top: One draws from the well without hindrance. It is dependable. Supreme good fortune."],
      },
    },
    { /* 49 泽火革 */
      name: { zh: "泽火革", en: "Ge (Revolution / Moulting)" },
      statement: { zh: "革：己日乃孚，元亨，利贞，悔亡。", en: "Ge: on your own day you are believed. Supreme success, furthering through perseverance. Remorse disappears." },
      lines: {
        zh: ["初九：巩用黄牛之革。", "六二：己日乃革之，征吉，无咎。", "九三：征凶，贞厉。革言三就，有孚。", "九四：悔亡，有孚改命，吉。", "九五：大人虎变，未占有孚。", "上六：君子豹变，小人革面。征凶，居贞吉。"],
        en: ["Nine at the beginning: Wrapped in the hide of a yellow cow.", "Six in the second place: When one's own day comes, one may create revolution. Starting brings good fortune. No blame.", "Nine in the third place: Starting brings misfortune. Perseverance with danger. When talk of revolution has gone the rounds three times, one may commit himself, and men will trust him.", "Nine in the fourth place: Remorse disappears. Men believe him. Changing the form of government brings good fortune.", "Nine in the fifth place: The great man changes like a tiger. Even before he questions the oracle he is believed.", "Six at the top: The superior man changes like a panther. The inferior man molts in the face. To undertake something brings misfortune. To remain persevering brings good fortune."],
      },
    },
    { /* 50 火风鼎 */
      name: { zh: "火风鼎", en: "Ding (The Caldron)" },
      statement: { zh: "鼎：元吉，亨。", en: "Ding: the caldron. Supreme good fortune. Success." },
      lines: {
        zh: ["初六：鼎颠趾，利出否，得妾以其子，无咎。", "九二：鼎有实，我仇有疾，不我能即，吉。", "九三：鼎耳革，其行塞，雉膏不食。方雨亏悔，终吉。", "九四：鼎折足，覆公餗，其形渥，凶。", "六五：鼎黄耳金铉，利贞。", "上九：鼎玉铉，大吉，无不利。"],
        en: ["Six at the beginning: A cauldron with legs upturned. Furthers removal of stagnating stuff. One takes a concubine for the sake of a son. No blame.", "Nine in the second place: There is food in the cauldron. My comrades are envious, but they cannot harm me. Good fortune.", "Nine in the third place: The handle of the cauldron is altered. One is impeded in his way of life. The fat of the pheasant is not eaten. Once rain falls, remorse is spent. Good fortune comes in the end.", "Nine in the fourth place: The legs of the cauldron are bent. The prince's meal is spilled and his person soiled. Misfortune.", "Six in the fifth place: The cauldron has yellow handles, golden carrying rings. Perseverance furthers.", "Nine at the top: The cauldron has rings of jade. Great good fortune. Nothing that would not act to further."],
      },
    },
    { /* 51 震为雷 */
      name: { zh: "震为雷", en: "Zhen (The Arousing / Shock)" },
      statement: { zh: "震：亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。", en: "Zhen: shock brings success. Shock comes — oh, oh! Laughing words — ha, ha! The shock terrifies for a hundred miles, yet he does not let fall the sacrificial spoon and chalice." },
      lines: {
        zh: ["初九：震来虩虩，后笑言哑哑，吉。", "六二：震来厉，亿丧贝，跻于九陵，勿逐，七日得。", "六三：震苏苏，震行无眚。", "九四：震遂泥。", "六五：震往来厉，亿无丧，有事。", "上六：震索索，视矍矍，征凶。震不于其躬，于其邻，无咎。婚媾有言。"],
        en: ["Nine at the beginning: Shock comes — oh, oh! Then follow laughing words — ha, ha! Good fortune.", "Six in the second place: Shock comes bringing danger. A hundred thousand times you lose your treasures and climb nine hills. Do not pursue them. After seven days you will get them back.", "Six in the third place: Shock comes and makes one distraught. If shock spurs to action, one remains free of misfortune.", "Nine in the fourth place: Shock is mired.", "Six in the fifth place: Shock goes hither and thither, bringing danger. However, nothing at all is lost. Yet there are things to be done.", "Six at the top: Shock brings ruin and terrified gazing around. Going ahead brings misfortune. If it has not yet touched one's own body but has reached one's neighbor first, there is no blame. One's relatives murmur."],
      },
    },
    { /* 52 艮为山 */
      name: { zh: "艮为山", en: "Gen (Keeping Still)" },
      statement: { zh: "艮其背，不获其身，行其庭，不见其人，无咎。", en: "Gen: keeping his back still so that he no longer feels his body. He goes into his courtyard and does not see his people. No blame." },
      lines: {
        zh: ["初六：艮其趾，无咎，利永贞。", "六二：艮其腓，不拯其随，其心不快。", "九三：艮其限，列其夤，厉熏心。", "六四：艮其身，无咎。", "六五：艮其辅，言有序，悔亡。", "上九：敦艮，吉。"],
        en: ["Six at the beginning: Keeping his toes still. No blame. Continued perseverance furthers.", "Six in the second place: Keeping his calves still. He cannot rescue him whom he follows. His heart is not glad.", "Nine in the third place: Keeping his hips still. Making his sacrum stiff. Dangerous. The heart suffocates.", "Six in the fourth place: Keeping his trunk still. No blame.", "Six in the fifth place: Keeping his jaws still. The words have order. Remorse disappears.", "Nine at the top: Noblehearted keeping still. Good fortune."],
      },
    },
    { /* 53 风山渐 */
      name: { zh: "风山渐", en: "Jian (Development / Gradual Progress)" },
      statement: { zh: "渐：女归吉，利贞。", en: "Jian: development. The maiden is given in marriage. Good fortune. Perseverance furthers." },
      lines: {
        zh: ["初六：鸿渐于干，小子厉，有言，无咎。", "六二：鸿渐于磐，饮食衎衎，吉。", "九三：鸿渐于陆，夫征不复，妇孕不育，凶。利御寇。", "六四：鸿渐于木，或得其桷，无咎。", "九五：鸿渐于陵，妇三岁不孕。终莫之胜，吉。", "上九：鸿渐于陆，其羽可用为仪，吉。"],
        en: ["Six at the beginning: The wild goose gradually draws near the shore. The young son is in danger. There is talk. No blame.", "Six in the second place: The wild goose gradually draws near the cliff. Eating and drinking in peace and concord. Good fortune.", "Nine in the third place: The wild goose gradually draws near the plateau. The man goes forth and does not return. The woman carries a child but does not bring it forth. Misfortune. It furthers one to fight off robbers.", "Six in the fourth place: The wild goose gradually draws near the tree. Perhaps it will find a flat branch. No blame.", "Nine in the fifth place: The wild goose gradually draws near the summit. For three years the woman has no child. In the end nothing can hinder her. Good fortune.", "Nine at the top: The wild goose gradually draws near the cloud heights. Its feathers can be used for the sacred dance. Good fortune."],
      },
    },
    { /* 54 雷泽归妹 */
      name: { zh: "雷泽归妹", en: "Gui Mei (The Marrying Maiden)" },
      statement: { zh: "归妹：征凶，无攸利。", en: "Gui Mei: the marrying maiden. Undertakings bring misfortune. Nothing that would further." },
      lines: {
        zh: ["初九：归妹以娣，跛能履，征吉。", "九二：眇能视，利幽人之贞。", "六三：归妹以须，反归以娣。", "九四：归妹愆期，迟归有时。", "六五：帝乙归妹，其君之袂，不如其娣之袂良。月几望，吉。", "上六：女承筐，无实，士刲羊，无血。无攸利。"],
        en: ["Nine at the beginning: The marrying maiden as a concubine. A lame man who is able to tread. Undertakings bring good fortune.", "Nine in the second place: A one-eyed man who is able to see. The perseverance of a solitary man furthers.", "Six in the third place: The marrying maiden as a slave. She returns as a concubine.", "Nine in the fourth place: The marrying maiden draws out the allotted time. A late marriage comes in due course.", "Six in the fifth place: The sovereign Yi gave his daughter in marriage. The embroidered garments of the princess were not as gorgeous as those of the serving maid. The moon that is nearly full brings good fortune.", "Six at the top: The woman holds the basket, but there are no fruits in it. The man stabs the sheep, but no blood flows. Nothing that acts to further."],
      },
    },
    { /* 55 雷火丰 */
      name: { zh: "雷火丰", en: "Feng (Abundance)" },
      statement: { zh: "丰：亨，王假之，勿忧，宜日中。", en: "Feng: abundance has success. The king attains abundance. Be not sad. Be like the sun at midday." },
      lines: {
        zh: ["初九：遇其配主，虽旬无咎，往有尚。", "六二：丰其蔀，日中见斗，往得疑疾，有孚发若，吉。", "九三：丰其沛，日中见沫，折其右肱，无咎。", "九四：丰其蔀，日中见斗，遇其夷主，吉。", "六五：来章，有庆誉，吉。", "上六：丰其屋，蔀其家，窥其户，阒其无人，三岁不觌，凶。"],
        en: ["Nine at the beginning: When a man meets his destined ruler, they can be together ten days, and it is not a mistake. Going meets with recognition.", "Six in the second place: The curtain is of such fullness that the polestars can be seen at noon. Through going one meets with mistrust and hate. If he rouses him through truth, good fortune comes.", "Nine in the third place: The underbrush is of such abundance that the small stars can be seen at noon. He breaks his right arm. No blame.", "Nine in the fourth place: The curtain is of such fullness that the polestars can be seen at noon. He meets his ruler, who is of like kind. Good fortune.", "Six in the fifth place: Lines are coming, blessing and fame draw near. Good fortune.", "Six at the top: His house is in a state of abundance. He screens off his family. He peers through the gate and no longer perceives anyone. For three years he sees nothing. Misfortune."],
      },
    },
    { /* 56 火山旅 */
      name: { zh: "火山旅", en: "Lü (The Wanderer)" },
      statement: { zh: "旅：小亨，旅贞吉。", en: "Lü: the wanderer. Success through smallness. Perseverance brings good fortune to the wanderer." },
      lines: {
        zh: ["初六：旅琐琐，斯其所取灾。", "六二：旅即次，怀其资，得童仆贞。", "九三：旅焚其次，丧其童仆，贞厉。", "九四：旅于处，得其资斧，我心不快。", "六五：射雉一矢亡，终以誉命。", "上九：鸟焚其巢，旅人先笑后号啕。丧牛于易，凶。"],
        en: ["Six at the beginning: If the wanderer busies himself with trivial things, he draws down misfortune upon himself.", "Six in the second place: The wanderer comes to an inn. He has his property with him. He wins the steadfastness of a young servant.", "Nine in the third place: The wanderer's inn burns down. He loses the steadfastness of his young servant. Danger.", "Nine in the fourth place: The wanderer rests in a shelter. He obtains his property and an ax. My heart is not glad.", "Six in the fifth place: He shoots a pheasant. It drops with the first arrow. In the end this brings both praise and office.", "Nine at the top: The bird's nest burns up. The wanderer laughs at first, then must needs lament and weep. Through carelessness he loses his cow. Misfortune."],
      },
    },
    { /* 57 巽为风 */
      name: { zh: "巽为风", en: "Xun (The Gentle / Penetrating)" },
      statement: { zh: "巽：小亨，利有攸往，利见大人。", en: "Xun: the gentle. Success through what is small. It furthers one to have somewhere to go. It furthers one to see the great man." },
      lines: {
        zh: ["初六：进退，利武人之贞。", "九二：巽在床下，用史巫纷若，吉无咎。", "九三：频巽，吝。", "六四：悔亡，田获三品。", "九五：贞吉悔亡，无不利。无初有终，先庚三日，后庚三日，吉。", "上九：巽在床下，丧其资斧，贞凶。"],
        en: ["Six at the beginning: In advancing and in retreating, the perseverance of a warrior furthers.", "Nine in the second place: Penetration under the bed. Priests and magicians are used in great number. Good fortune. No blame.", "Nine in the third place: Repeated penetration. Humiliation.", "Six in the fourth place: Remorse vanishes. During the hunt three kinds of game are caught.", "Nine in the fifth place: Perseverance brings good fortune. Remorse vanishes. Nothing that does not further. No beginning, but an end. Before the change, three days. After the change, three days. Good fortune.", "Nine at the top: Penetration under the bed. He loses his property and his ax. Perseverance brings misfortune."],
      },
    },
    { /* 58 兑为泽 */
      name: { zh: "兑为泽", en: "Dui (The Joyous)" },
      statement: { zh: "兑：亨，利贞。", en: "Dui: the joyous. Success. Perseverance is favorable." },
      lines: {
        zh: ["初九：和兑，吉。", "九二：孚兑，吉，悔亡。", "六三：来兑，凶。", "九四：商兑未宁，介疾有喜。", "九五：孚于剥，有厉。", "上六：引兑。"],
        en: ["Nine at the beginning: Contented joyousness. Good fortune.", "Nine in the second place: Sincere joyousness. Good fortune. Remorse disappears.", "Six in the third place: Coming joyousness. Misfortune.", "Nine in the fourth place: Joyousness that is weighed is not at peace. After ridding himself of mistakes a man has joy.", "Nine in the fifth place: Sincerity toward disintegrating influences. Danger.", "Six at the top: Seductive joyousness."],
      },
    },
    { /* 59 风水涣 */
      name: { zh: "风水涣", en: "Huan (Dispersion)" },
      statement: { zh: "涣：亨。王假有庙，利涉大川，利贞。", en: "Huan: dispersion. Success. The king approaches his temple. It furthers one to cross the great water. Perseverance furthers." },
      lines: {
        zh: ["初六：用拯马壮，吉。", "九二：涣奔其机，悔亡。", "六三：涣其躬，无悔。", "六四：涣其群，元吉。涣有丘，匪夷所思。", "九五：涣汗其大号，涣王居，无咎。", "上九：涣其血去，逖出，无咎。"],
        en: ["Six at the beginning: He brings help with the strength of a horse. Good fortune.", "Nine in the second place: At the dissolution he hurries to that which supports him. Remorse disappears.", "Six in the third place: He dissolves his self. No remorse.", "Six in the fourth place: He dissolves his bond with his group. Supreme good fortune. Dispersion leads in turn to accumulation. This is something that ordinary men do not think of.", "Nine in the fifth place: His loud cries are as dissolving as sweat. Dissolution! A king abides without blame.", "Nine at the top: He dissolves his blood. Departing, keeping at a distance, going out, is without blame."],
      },
    },
    { /* 60 水泽节 */
      name: { zh: "水泽节", en: "Jie (Limitation)" },
      statement: { zh: "节：亨。苦节不可贞。", en: "Jie: limitation. Success. Galling limitation must not be persevered in." },
      lines: {
        zh: ["初九：不出户庭，无咎。", "九二：不出门庭，凶。", "六三：不节若，则嗟若，无咎。", "六四：安节，亨。", "九五：甘节，吉，往有尚。", "上六：苦节，贞凶，悔亡。"],
        en: ["Nine at the beginning: Not going out of the door and the courtyard is without blame.", "Nine in the second place: Not going out of the gate and the courtyard brings misfortune.", "Six in the third place: He who knows no limitation will have cause to lament. No blame.", "Six in the fourth place: Contented limitation. Success.", "Nine in the fifth place: Sweet limitation brings good fortune. Going brings esteem.", "Six at the top: Galling limitation. Perseverance brings misfortune. Remorse disappears."],
      },
    },
    { /* 61 风泽中孚 */
      name: { zh: "风泽中孚", en: "Zhong Fu (Inner Truth)" },
      statement: { zh: "中孚：豚鱼吉，利涉大川，利贞。", en: "Zhong Fu: inner truth. Pigs and fishes. Good fortune. It furthers one to cross the great water. Perseverance furthers." },
      lines: {
        zh: ["初九：虞吉，有它不燕。", "九二：鸣鹤在阴，其子和之。我有好爵，吾与尔靡之。", "六三：得敌，或鼓或罢，或泣或歌。", "六四：月几望，马匹亡，无咎。", "九五：有孚挛如，无咎。", "上九：翰音登于天，贞凶。"],
        en: ["Nine at the beginning: Being prepared brings good fortune. If there are secret designs, it is disquieting.", "Nine in the second place: A crane calling in the shade. Its young answers it. I have a good goblet. I will share it with you.", "Six in the third place: He finds a comrade. Now he beats the drum, now he stops. Now he sobs, now he sings.", "Six in the fourth place: The moon is nearly full. If only the team of horses diverges, there is no blame.", "Nine in the fifth place: He possesses truth, which links together. No blame.", "Nine at the top: Cockcrow penetrating to heaven. Perseverance brings misfortune."],
      },
    },
    { /* 62 雷山小过 */
      name: { zh: "雷山小过", en: "Xiao Guo (Preponderance of the Small)" },
      statement: { zh: "小过：亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。", en: "Xiao Guo: preponderance of the small. Success. Perseverance furthers. Small things may be done; great things should not be done. The flying bird brings the message: not advised to ascend, advised to descend — great good fortune." },
      lines: {
        zh: ["初六：飞鸟以凶。", "六二：过其祖，遇其妣。不及其君，遇其臣，无咎。", "九三：弗过防之，从或戕之，凶。", "九四：无咎，弗过遇之，往厉必戒，勿用永贞。", "六五：密云不雨，自我西郊。公弋取彼在穴。", "上六：弗遇过之，飞鸟离之，凶，是谓灾眚。"],
        en: ["Six at the beginning: The bird meets with misfortune through flying.", "Six in the second place: She passes by her ancestor and meets her ancestress. He does not reach his prince and meets the official. No blame.", "Nine in the third place: If one takes no precautions, somebody plots against him from below. Misfortune.", "Nine in the fourth place: No blame. He meets him without passing by. Going brings danger. One must be on guard. Do not act. Be constantly persevering.", "Six in the fifth place: Dense clouds, no rain from our western territory. The prince shoots and hits him who is in the cave.", "Six at the top: He passes him by, not meeting him. The flying bird leaves him. Misfortune. This means bad luck and injury."],
      },
    },
    { /* 63 水火既济 */
      name: { zh: "水火既济", en: "Ji Ji (After Completion)" },
      statement: { zh: "既济：亨小，利贞，初吉终乱。", en: "Ji Ji: after completion. Success in small matters. Perseverance furthers. At the beginning good fortune. At the end disorder." },
      lines: {
        zh: ["初九：曳其轮，濡其尾，无咎。", "六二：妇丧其茀，勿逐，七日得。", "九三：高宗伐鬼方，三年克之。小人勿用。", "六四：繻有衣袽，终日戒。", "九五：东邻杀牛，不如西邻之禴祭，实受其福。", "上六：濡其首，厉。"],
        en: ["Nine at the beginning: He brakes his wheels. He gets his tail in the water. No blame.", "Six in the second place: The woman loses the curtain of her carriage. Do not run after it. On the seventh day you will get it.", "Nine in the third place: The Illustrious Ancestor disciplines the Devil's Country. After three years he conquers it. Inferior people must not be employed.", "Six in the fourth place: The finest clothes turn to rags. Be careful all day long.", "Nine in the fifth place: The neighbor in the east who slaughters an ox does not attain as much real happiness as the neighbor in the west with his small offering.", "Six at the top: He gets his head in the water. Danger."],
      },
    },
    { /* 64 火水未济 */
      name: { zh: "火水未济", en: "Wei Ji (Before Completion)" },
      statement: { zh: "未济：亨。小狐汔济，濡其尾，无攸利。", en: "Wei Ji: before completion. Success. But if the little fox, after nearly completing the crossing, gets his tail in the water, there is nothing that would further." },
      lines: {
        zh: ["初六：濡其尾，吝。", "九二：曳其轮，贞吉。", "六三：未济，征凶，利涉大川。", "九四：贞吉悔亡，震用伐鬼方，三年有赏于大国。", "六五：贞吉无悔，君子之光，有孚吉。", "上九：有孚于饮酒，无咎。濡其首，有孚失是。"],
        en: ["Six at the beginning: He gets his tail in the water. Humiliating.", "Nine in the second place: He brakes his wheels. Perseverance brings good fortune.", "Six in the third place: Before completion, the onset brings misfortune. It furthers one to cross the great water.", "Nine in the fourth place: Perseverance brings good fortune, remorse disappears. Shock, thus to discipline the Devil's Country. For three years, great realms confer rewards.", "Six in the fifth place: Perseverance brings good fortune. No remorse. The light of the superior man is true. Good fortune.", "Nine at the top: There is drinking of wine in genuine confidence. No blame. But if one wets his head, he loses it, in truth."],
      },
    },
  ];

  function hexByNo(no) {
    return HEXAGRAMS[no - 1];
  }

  function resolveReading(lines) {
    var pn = primaryNo(lines);
    var cn = changedNo(lines);
    var moving = movingPositions(lines);
    var p = hexByNo(pn);
    var c = cn ? hexByNo(cn) : null;
    return {
      primary: {
        no: pn,
        symbol: String.fromCharCode(0x4DC0 + pn - 1),
        name: p.name[LANG],
        statement: p.statement[LANG],
        lowerTrigram: TRIGRAM_NAMES[LANG][trigramIndex(lines, 0)],
        upperTrigram: TRIGRAM_NAMES[LANG][trigramIndex(lines, 3)],
      },
      changed: c ? {
        no: cn,
        symbol: String.fromCharCode(0x4DC0 + cn - 1),
        name: c.name[LANG],
        statement: c.statement[LANG],
      } : null,
      moving: moving.map(function (pos) { return { position: pos, text: p.lines[LANG][pos - 1] }; }),
    };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  /* ---------- 第二步：录入项生成 ---------- */
  var linesContainer = document.getElementById("liuyao-lines");
  var selected = [null, null, null, null, null, null];

  T.lineLabels.forEach(function (label, i) {
    var fieldset = document.createElement("fieldset");
    fieldset.className = "liuyao-line";
    var legend = document.createElement("legend");
    legend.textContent = label;
    fieldset.appendChild(legend);
    T.options.forEach(function (optText, j) {
      var id = "liuyao-line-" + i + "-" + j;
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "liuyao-line-" + i;
      input.id = id;
      input.value = T.optionValues[j];
      input.addEventListener("change", function () {
        selected[i] = T.optionValues[j];
        renderPreview();
        updateCastBtn();
      });
      var lab = document.createElement("label");
      lab.htmlFor = id;
      lab.textContent = optText;
      fieldset.appendChild(input);
      fieldset.appendChild(lab);
    });
    linesContainer.appendChild(fieldset);
  });

  /* 起卦按钮 */
  var castBtn = document.createElement("button");
  castBtn.type = "button";
  castBtn.className = "liuyao-cast";
  castBtn.textContent = LANG === "zh" ? "起卦" : "Cast Hexagram";
  castBtn.disabled = true;
  linesContainer.appendChild(castBtn);

  function updateCastBtn() {
    castBtn.disabled = selected.indexOf(null) !== -1;
  }

  /* ---------- 实时预览 ---------- */
  function renderPreview() {
    var html = "";
    for (var i = 5; i >= 0; i--) {
      var v = selected[i];
      if (v === null) { html += '<div class="yaoline pending"></div>'; continue; }
      var yang = isYang(v);
      var moving = v === 6 || v === 9;
      html += '<div class="yaoline ' + (yang ? "yang" : "yin") + (moving ? " moving" : "") + '"></div>';
    }
    document.getElementById("liuyao-preview").innerHTML = html;
  }
  renderPreview();

  /* ---------- 第三步：结果渲染 ---------- */
  var interpretBtn = document.getElementById("liuyao-interpret-btn");
  var resultBox = document.getElementById("liuyao-result");
  var interpretSection = document.getElementById("liuyao-interpret");
  var errorBox = document.getElementById("liuyao-error");
  var chartSnapshot = null;

  function showResult() {
    var r = chartSnapshot;
    var html = "<h2>" + esc(T.resultTitle) + "</h2>";
    html += '<div class="liuyao-hex-display">';
    html += '<div class="liuyao-hex-card"><div class="liuyao-symbol">' + esc(r.primary.symbol) + "</div>";
    html += "<div>" + esc(T.primary) + "</div><div>" + esc(r.primary.name) + "</div>";
    html += "<div>" + esc(r.primary.lowerTrigram) + " / " + esc(r.primary.upperTrigram) + "</div></div>";
    if (r.changed) {
      html += '<div class="liuyao-hex-card"><div class="liuyao-symbol">' + esc(r.changed.symbol) + "</div>";
      html += "<div>" + esc(T.changed) + "</div><div>" + esc(r.changed.name) + "</div></div>";
    }
    html += "</div>";
    resultBox.innerHTML = html;
    resultBox.hidden = false;
    interpretBtn.hidden = false;
  }

  /* ---------- 解读请求 ---------- */
  function setStatus(text, withRetry) {
    var body = interpretSection.querySelector(".liuyao-card-body");
    body.innerHTML = "";
    var p = document.createElement("p");
    p.className = "status loading";
    p.textContent = text;
    body.appendChild(p);
    if (withRetry) {
      var btn = document.createElement("button");
      btn.className = "liuyao-retry";
      btn.textContent = T.retry;
      btn.addEventListener("click", requestInterpret);
      body.appendChild(btn);
    }
  }

  function renderMarkdown(md) {
    if (typeof DOMPurify === "undefined" || typeof marked === "undefined") {
      throw new Error(T.mdLibLoading);
    }
    interpretSection.querySelector(".liuyao-card-body").innerHTML = DOMPurify.sanitize(marked.parse(md));
  }

  function requestInterpret() {
    errorBox.hidden = true;
    interpretSection.hidden = false;
    setStatus(T.loading, false);
    var payload = {
      lang: LANG,
      question: chartSnapshot.question,
      lines: chartSnapshot.lines,
      now: { solar: chartSnapshot.solar },
      primary: { name: chartSnapshot.primary.name, statement: chartSnapshot.primary.statement },
    };
    if (chartSnapshot.changed) {
      payload.changed = { name: chartSnapshot.changed.name, statement: chartSnapshot.changed.statement };
    }
    if (chartSnapshot.moving.length > 0) {
      payload.moving = chartSnapshot.moving;
    }
    fetch("/api/liuyao/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!json.ok) {
          var code = json.error && json.error.code;
          throw new Error((T.errMap && T.errMap[code]) || T.failed);
        }
        return json.data.markdown;
      });
    }).then(function (md) {
      renderMarkdown(md);
    }).catch(function (e) {
      setStatus(T.failed + e.message, true);
    });
  }

  interpretBtn.addEventListener("click", requestInterpret);

  /* ---------- 起卦（从第二步进入第三步） ---------- */
  castBtn.addEventListener("click", function () {
    var question = document.getElementById("liuyao-question").value.trim();
    if (!question) {
      errorBox.textContent = T.noQuestion;
      errorBox.hidden = false;
      return;
    }
    errorBox.hidden = true;
    var lines = selected.slice();
    var reading = resolveReading(lines);
    var today = new Date();
    function two(n) { return (n < 10 ? "0" : "") + n; }
    chartSnapshot = {
      question: question,
      lines: lines,
      solar: today.getFullYear() + "-" + two(today.getMonth() + 1) + "-" + two(today.getDate()),
      primary: reading.primary,
      changed: reading.changed,
      moving: reading.moving,
    };
    showResult();
    document.getElementById("liuyao-step3").scrollIntoView({ behavior: "smooth" });
  });
})();
