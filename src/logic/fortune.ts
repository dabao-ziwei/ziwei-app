import { ZiWeiEngine } from './engine';
import type { ChartData, Palace } from './types';
import { Solar, LunarYear } from 'lunar-typescript';
import { PALACE_NAMES } from './constants'; 

// --- [新增] 定義 WeeklyFortune 介面 ---
export interface WeeklyFortune {
    baseScore: number;
    scores: {
        total: number;
        career: number;
        wealth: number;
        love: number;
        travel: number;
        social: number;
    };
    guidance: {
        summary: string;
        luckyTips: string;
    };
}

// 定義五大維度 (擴充以支援新 Widget)
export interface DailyFortune {
  score: number;       // 總分
  weather: 'sunny' | 'cloudy' | 'rainy';
  summary: string;
  
  // 五角圖數據
  scores: {
    self: number;     // 原有: 自身
    social: number;   
    love: number;     
    travel: number;   
    wealth: number;   
    // [新增] 相容欄位
    career: number;   // 對應 self
    total: number;    // 對應 score
  };

  // 每日指引
  advice: {
    self: string;
    social: string;
    love: string;
    travel: string;
    wealth: string;
  };

  // [新增] 指引物件 (給 Widget 用)
  guidance: {
      summary: string;
      luckyTips: string;
  };

  // 諮詢引導
  consultationHook: {
    show: boolean;      
    reason: string;     
    text: string;       
    linkText: string;   
  } | null;

  details: {
    overall: string;
    loveCareer: string;
    wealth: string;
  };

  // 開發驗證資訊
  devInfo: {
    baseScore: number;      
    lunarDateStr: string;   
    flowYearZhi: string;    
    flowMonthAnchor: string;
    flowMonthZhi: string;   
    flowDayZhi: string;     
    formulas: {             
        base: string[];     
        self: string[];
        social: string[];
        love: string[];
        travel: string[];
        wealth: string[];
    }
  }
}

// --- 靜態資料表 ---
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 四化表 (祿, 權, 科, 忌)
const SI_HUA_MAP: Record<string, string[]> = {
  '甲': ['廉貞', '破軍', '武曲', '太陽'],
  '乙': ['天機', '天梁', '紫微', '太陰'],
  '丙': ['天同', '天機', '文昌', '廉貞'],
  '丁': ['太陰', '天同', '天機', '巨門'],
  '戊': ['貪狼', '太陰', '右弼', '天機'],
  '己': ['武曲', '貪狼', '天梁', '文曲'],
  '庚': ['太陽', '武曲', '天同', '天相'], 
  '辛': ['巨門', '太陽', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左輔', '武曲'],
  '癸': ['破軍', '巨門', '太陰', '貪狼'],
};

const LU_YANG_TUO_MAP: Record<string, number> = {
  '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5,
  '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0,
};

// --- [新增] 運勢等級判斷 helper ---
export const getFortuneLevel = (score: number) => {
    if (score >= 90) return { label: '大吉', color: 'text-red-500' };
    if (score >= 80) return { label: '吉', color: 'text-orange-500' };
    if (score >= 60) return { label: '平', color: 'text-green-500' };
    if (score >= 40) return { label: '凶', color: 'text-gray-500' };
    return { label: '大凶', color: 'text-gray-700' };
};

// --- 文案庫 (ADVICE_POOL) ---
// (保留原本的 ADVICE_POOL 物件內容，這裡為了簡潔省略重複貼上，請保留原檔案內的 ADVICE_POOL)
const ADVICE_POOL = {
    RED_ALERT: {
        self: ["職場磁場混亂，多做多錯。與其盲目衝刺，不如調整呼吸，維持現狀就是最大的進步。", "感覺周遭充滿了不確定的變數，像在濃霧中行走。把重心放回自己身上，別急著展現成果。", "此刻適合沈潛。像一顆種子埋在土裡，等待風暴過去，無需強出頭，安穩即是力量。"],
        wealth: ["市場充滿迷霧，直覺可能失準。看緊荷包，遠離誘惑，別讓情緒左右了你的錢包。", "看似美好的機會背後可能藏著代價。最好的投資就是按兵不動，守住就是賺到。", "慾望如野火，需用理智築起防火牆。今日不宜大動作，靜觀其變方為上策。"],
        social: ["人際圈雜音較多，獨處是最高級的享受。把心門關小一點，遠離是非圈。", "過度的交流容易引發誤會。今天適合做個安靜的旁觀者，不用刻意融入。", "像刺蝟收起尖刺，回到自己的洞穴。與其在人群中感到孤獨，不如享受一個人的寧靜。"],
        travel: ["外在變動能量強，易感阻礙。安穩的室內勝過外面的風雨，待在熟悉環境更有安全感。", "如果非必要，減少長途移動。今天的世界有點躁動，家是你最穩固的堡壘。", "行路難，不在山水，而在心境。暫緩腳步，讓心靈先抵達平靜的彼岸。"],
        love: ["能量場不穩，一句無心話都可能被放大。沈默是金，給彼此一點空間。", "暫時的留白能避免摩擦。不適合討論嚴肅話題，用眼神交流勝過千言萬語。", "愛有時需要距離來發酵。退一步，不是冷漠，而是為了保護彼此不受情緒波及。"]
    },
    MIXED: {
        self: ["工作上吉凶交戰，看似機會很多，背後卻藏著陷阱。繁華背後別忽視微小警訊。", "像是洗了一場三溫暖，專案進度得而復失。別太在意一時的成敗，這只是過程。", "越想用力抓緊權力，局勢反而流失越快。那種心有餘而力不足的拉扯感，承認極限反而能解脫。"],
        wealth: ["財務上有進有出，左手進右手出的感覺強烈。看起來熱鬧，其實沒留住多少。", "投資靈感與風險並存。心裡像有兩個聲音在吵架，建議各退一步，取中庸之道。", "購物車裡的猶豫不決反映了內心的矛盾。這種想享受又充滿罪惡感的糾結，不如先冷靜一天。"],
        social: ["人際關係又愛又恨，熱鬧過後感到莫名的空虛。這種反差感讓你有點不知所措。", "某個朋友讓你覺得很煩卻又離不開。這種矛盾的依賴關係，今天會特別明顯。", "在群體中想表現卻又怕受傷。這種既期待又怕受傷害的心情，讓你顯得有點彆扭。"],
        travel: ["想出門又怕麻煩，出門了又想回家。這種反覆的心情會讓行程充滿變數。", "旅途中驚喜與驚嚇並存。雖然過程曲折，但事後回想起來也是一種獨特的回憶。", "行程安排過滿導致消化不良。想貪心地去很多地方，最後卻累壞了自己。"],
        love: ["愛恨交織的感覺特別強烈。對方可能完全不知道，但你內心已經經歷了一場暴風雨。", "想靠近又想逃離，這種忽冷忽熱的態度會讓對方摸不著頭緒。試著穩定自己的情緒。", "關係中充滿了張力，既有甜蜜的牽絆也有窒息的壓力。這就是痛並快樂著的感覺。"]
    },
    JI_ONLY: {
        self: ["工作上總覺得少了點什麼，像拼圖缺了一塊。這種空缺感讓你提不起勁，別太勉強自己。", "感覺付出與回收不成正比，一種莫名的失落感籠罩。這不是你不夠好，只是時機未到。", "事情看似完成了，心裡卻沒有成就感？這種空虛是暫時的，給自己一杯咖啡的時間。"],
        wealth: ["看著餘額，心裡有一種說不出的失落。不是沒錢，而是覺得價值感流失了。", "錢包好像破了個小洞，雖然沒大失血，但那種守不住的無力感讓你很心累。", "投資市場的波動讓你感到不安，總覺得會失去什麼。這種恐懼比實際損失更折磨人。"],
        social: ["在人群中卻感到莫名的空虛。熱鬧是他們的，你什麼也沒有。不如回家享受獨處。", "對某段關係感到失望，覺得曾經的熱情冷卻了。接受這份冷淡，也是一種成長。", "總覺得被忽略或被遺忘？這種孤單感是心靈的訊號，提醒你要更愛自己一點。"],
        travel: ["出門在外卻覺得心無所依。原本期待的風景，看在眼裡卻是一片蒼白。", "行程中可能會有些小遺憾，讓你覺得這趟門出得有點不值。放寬心，遺憾也是風景。", "總覺得提不起勁出門？那種不想動的無力感，其實是身體在向你討休息。"],
        love: ["明明兩個人在一起，卻感覺心隔了好遠。這種無形的距離感最傷人。", "總覺得好像失去了什麼，對關係感到一陣莫名的恐慌。別想太多，給彼此一點空間。", "心裡的缺口，對方填補不了。這種空虛感需要你自己來面對，別把期待全放在對方身上。"]
    },
    PEACE: {
        self: ["歲月靜好，專注當下。沒有雜訊與意外，正是沈澱與累積實力的好時機。", "按部就班完成手邊任務，這種踏實的進度感，是你今天最大的成就來源。", "像平靜的湖面，映照出真實的自己。享受這份專注，把每件小事做到極致。"],
        wealth: ["流水不爭先，爭的是滔滔不絕。安穩的狀態最適合檢視長期規劃。", "守成即是獲利。看著平穩的數字，雖無大起大落的刺激，卻有一種厚實的安全感。", "不需冒險也能有所收穫。今天的財運像微風，雖不猛烈，但很舒適。"],
        social: ["君子之交淡如水。享受這種輕鬆自在的氛圍，不用刻意討好誰，做舒服的自己。", "沒有過多的客套與負擔，今天的人際關係像一杯溫開水，解渴又無負擔。", "平淡的交流中藏著真誠。不需要戴上面具，簡單的問候就能溫暖人心。"],
        travel: ["行雲流水，一路順風。沒有意外就是最好的安排，試著放慢腳步欣賞沿途風景。", "今天的行程像設定好的導航一樣精準。享受這份順暢，去發現平常忽略的美好。", "世界對你很溫柔。走出門，陽光和微風都在歡迎你，適合漫無目的地散步。"],
        love: ["平平淡淡才是真。不需要轟轟烈烈，兩人安靜待在同一空間就是最珍貴的默契。", "細水長流的感情最動人。即使不說話也不覺得尷尬，享受這份寧靜的陪伴。", "像午後的陽光，溫暖而不刺眼。今天適合用溫柔的態度，回應對方的存在。"]
    },
    SHA_SINGLE: {
        FIRE: { self: ["節奏變快，抓住稍縱即逝的火花。", "突發狀況顯眼，保持冷靜。", "忙碌後的落差感，調整呼吸。"], wealth: ["衝動消費？開心就好。", "財務波動短暫。", "莫名的空虛感？只是情緒。"], social: ["突如其來的熱絡，享受熱鬧。", "話題炸開，湊個熱鬧。", "熱鬧後的冷場，休息一下。"], travel: ["說走就走，變動更有趣。", "小插曲當驚喜。", "意興闌珊就回家。"], love: ["觸電般的熱度，把握激情。", "戲劇化發展，輕鬆看待。", "氣氛降至冰點，冷卻一下。"] },
        RAM: { self: ["相信直覺，傻勁打開局面。", "不修飾的真實。", "心直口快，真誠可貴。"], wealth: ["豪爽下單，心情愉悅。", "果斷操作。", "花錢變成了喜歡的樣子。"], social: ["直來直往，對方喜歡你的坦率。", "情緒反應大，做自己。", "真話不傷真朋友。"], travel: ["行動力帶來自由。", "急躁易引注意，放慢腳步。", "轉化為運動能量。"], love: ["情緒直接表達，關係更緊密。", "偶爾任性是情趣。", "主動示軟。"] },
        BELL: { self: ["享受意料之外的驚喜。", "直覺是雷達。", "不踏實感是正常的。"], wealth: ["敏銳察覺暗流，低調守財。", "精打細算。", "別想太多。"], social: ["心照不宣的默契。", "看破不說破。", "磁場暫時不合。"], travel: ["靈巧轉彎，發現新風景。", "小插曲是調味料。", "直覺叫你回家。"], love: ["神祕感更有情調。", "適度宣洩。", "直接問吧。"] },
        SPIN: { self: ["慢工出細活。", "猶豫是深思熟慮。", "老天讓你休息。"], wealth: ["糾結幫你省錢。", "給自己時間考慮。", "錯過的不屬於你。"], social: ["黏踢踢的深厚情誼。", "正視糾結。", "設立界線。"], travel: ["漫無目的也療癒。", "留戀就多待一會。", "在家耍廢也是旅行。"], love: ["糾纏是甜蜜證明。", "還在乎彼此。", "放手恢復彈性。"] }
    },
    INNER_SHA: {
        FIRE: { self: ["心裡有名火，深呼吸。"], wealth: ["買小東西犒賞自己。"], social: ["保持微笑，暫時煩躁。"], travel: ["心裡急？放慢腳步。"], love: ["忍住厭煩，很快過去。"] },
        RAM: { self: ["別鑽牛角尖，你很棒。"], wealth: ["錢再賺就有，放過自己。"], social: ["自找的刺痛感。"], travel: ["心靈自我防衛。"], love: ["給自己擁抱。"] },
        BELL: { self: ["世界沒那麼複雜。"], wealth: ["壓抑的直覺。"], social: ["保持距離就好。"], travel: ["早點回家休息。"], love: ["寫下來燒掉。"] },
        SPIN: { self: ["轉移注意力。"], wealth: ["選直覺喜歡的。"], social: ["對方沒想那麼多。"], travel: ["穿上鞋子直接走。"], love: ["別跟自己過不去。"] }
    },
    INNER_RED: { self: ["心累了，別逼自己。"], wealth: ["不安全感是情緒作祟。"], social: ["只想關機獨處。"], travel: ["想窩在舒適圈。"], love: ["去喝杯水冷靜一下。"] },
    INNER_MIXED: { self: ["自我辯論很累人。"], wealth: ["放過自己吧。"], social: ["內心審判庭休息一下。"], travel: ["心靈三溫暖。"], love: ["演得很累但過癮。"] }
};

const CONSULTATION_COPY = {
    COACH: ["局勢複雜，需要副駕駛。", "卡關磨損鬥志，重新定位。", "猶豫是成本，需要精準分析。"],
    THERAPIST: ["結越拉越緊，需要梳理。", "心裡的雨，找人聊聊。", "當局者迷，點燈照亮盲點。"],
    MASTER: ["能量波動大，化煞為權。", "煞星是能量，學會駕馭。", "蹲低跳高，指引起跳時機。"]
};

export const calculateDailyFortune = (engine: ZiWeiEngine, date?: Date): DailyFortune => {
  const chart = engine.getChartData();
  const targetDate = date || new Date();
  
  const dayHash = targetDate.getDate() % 3;

  // 1. 計算時空參數
  const timeParams = calcTimeParameters(chart, targetDate);
  const { flowDayIdx, flowMonthIdx, lunarStr, flowYearZhi, flowMonthAnchor } = timeParams;

  // 2. 取得重要天干參數
  const flowMonthGan = chart.palaces[flowMonthIdx].ganIndex;
  const flowDayGan = chart.palaces[flowDayIdx].ganIndex;
  const nianGan = timeParams.nianGan;
  const daGan = timeParams.daGan;
  const birthGan = (chart.lunarYear - 4) % 10;

  // 3. 取得各層級命宮
  const benMingPos = engine.getMingPos();
  const age = timeParams.virtualAge;
  const daXianPalace = chart.palaces.find(p => age >= p.ages[0] && age <= p.ages[1]);
  const daMingPos = daXianPalace ? daXianPalace.index : 0; 
  const liuMingPos = chart.palaces.findIndex(p => p.zhiIndex === flowYearZhi);

  // 4. 計算基礎分
  const baseResult = calcBaseScore(chart, { benMingPos, daMingPos, liuMingPos, birthGan, daGan, nianGan });
  const baseScore = baseResult.score;

  // 5. 建立掃描器
  const scanner = new StarScanner(chart, { ...timeParams, birthGan, flowMonthGan, flowDayGan });

  // 6. 定義宮位 (主要 & 次要)
  const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;
  const palaceMapping: Record<keyof Omit<DailyFortune['scores'], 'career' | 'total'>, { main: number, sec: number }> = {
      self:   { main: getP(4), sec: getP(10) }, 
      wealth: { main: getP(8), sec: getP(2) },  
      social: { main: getP(5), sec: getP(11) }, 
      travel: { main: getP(9), sec: getP(3) },  
      love:   { main: getP(10), sec: getP(4) }  
  };

  const scores: any = {};
  const advices: any = {};
  const logs: any = {};

  let totalScore = 0;
  let hasRedAlert = false;

  (Object.keys(palaceMapping) as Array<keyof typeof palaceMapping>).forEach(key => {
      const { main, sec } = palaceMapping[key];
      
      const scoreTargets = getScoreTargets(key, flowDayIdx);
      const scoreRes = calcCategoryScore(scanner, scoreTargets, baseScore);
      scores[key] = scoreRes.finalScore;
      logs[key] = scoreRes.logs;
      totalScore += scoreRes.finalScore;

      const mainAnalysis = scanner.analyzePalace(main);
      const secAnalysis = scanner.analyzePalace(sec);

      const mainBadCount = mainAnalysis.shaCount + (mainAnalysis.hasJi ? 1 : 0);
      const secBadCount = secAnalysis.shaCount + (secAnalysis.hasJi ? 1 : 0);

      let adviceText = ADVICE_POOL.PEACE[key][dayHash];

      if (mainBadCount >= 2) {
          adviceText = ADVICE_POOL.RED_ALERT[key][dayHash];
          hasRedAlert = true;
      } else if (mainBadCount === 1 && mainAnalysis.siHuaCount >= 2) {
           adviceText = ADVICE_POOL.MIXED[key][dayHash];
      } else if (mainBadCount === 1 && mainAnalysis.shaCount === 1) {
          const shaName = mainAnalysis.shaStars[0]; 
          let poolKey = '';
          if (shaName.includes('火')) poolKey = 'FIRE';
          else if (shaName.includes('鈴')) poolKey = 'BELL';
          else if (shaName.includes('羊')) poolKey = 'RAM';
          else if (shaName.includes('陀')) poolKey = 'SPIN';

          if (poolKey && (ADVICE_POOL.SHA_SINGLE as any)[poolKey]) {
              adviceText = (ADVICE_POOL.SHA_SINGLE as any)[poolKey][key][dayHash];
          }
      } else if (mainAnalysis.shaCount === 0 && mainAnalysis.hasJi) {
           adviceText = ADVICE_POOL.JI_ONLY[key][dayHash];
      } else if (secBadCount >= 2) {
           adviceText = ADVICE_POOL.INNER_RED[key][0]; 
      } else if (secAnalysis.shaCount === 1 && secAnalysis.siHuaCount >= 2) {
           adviceText = ADVICE_POOL.INNER_MIXED[key][0];
      } else if (secAnalysis.shaCount === 1) {
          const shaName = secAnalysis.shaStars[0];
          let poolKey = '';
          if (shaName.includes('火')) poolKey = 'FIRE';
          else if (shaName.includes('鈴')) poolKey = 'BELL';
          else if (shaName.includes('羊')) poolKey = 'RAM';
          else if (shaName.includes('陀')) poolKey = 'SPIN';

          if (poolKey && (ADVICE_POOL.INNER_SHA as any)[poolKey]) {
              const pool = (ADVICE_POOL.INNER_SHA as any)[poolKey][key];
              adviceText = pool ? pool[0] : "內心有些微波動，但無大礙。"; 
          }
      } else if (scores[key] < 60) {
           adviceText = ADVICE_POOL.JI_ONLY[key][dayHash];
      }

      advices[key] = adviceText;
  });

  const avgScore = Math.round((totalScore / 5) * 10) / 10;

  // 8. 諮詢引導
  let consultationHook = null;
  const isLowScore = avgScore < 60;
  
  if (isLowScore || hasRedAlert) {
      let type: 'COACH' | 'THERAPIST' | 'MASTER' = 'MASTER';
      let reason = '運勢能量波動較大';

      const minScore = Math.min(scores.self, scores.wealth, scores.love, scores.social, scores.travel);
      if (scores.self === minScore || scores.wealth === minScore) {
          type = 'COACH';
          reason = '事業財運面臨挑戰';
      } else if (scores.love === minScore || scores.social === minScore) {
          type = 'THERAPIST';
          reason = '人際情感需要梳理';
      }

      consultationHook = {
          show: true,
          reason,
          text: CONSULTATION_COPY[type][dayHash],
          linkText: type === 'COACH' ? '預約策略諮詢' : (type === 'THERAPIST' ? '預約心靈對話' : '預約流年解析')
      };
  }

  // [修改] 回傳結構擴充
  return {
    score: avgScore,
    weather: getWeather(avgScore),
    summary: getSummary(avgScore),
    scores: {
        ...scores,
        career: scores.self, // mapping
        total: avgScore,     // mapping
    },
    advice: advices, 
    // [新增] 指引物件
    guidance: {
        summary: advices['self'] || getSummary(avgScore),
        luckyTips: "今日宜靜不宜動，多聽少說，觀察周遭變化。",
    },
    consultationHook, 
    details: {
        overall: getAdvice('self', scores.self),
        loveCareer: getAdvice('love', scores.love),
        wealth: getAdvice('wealth', scores.wealth)
    },
    devInfo: {
        baseScore: baseScore,
        lunarDateStr: lunarStr,
        flowYearZhi: DI_ZHI[flowYearZhi],        
        flowMonthAnchor: DI_ZHI[flowMonthAnchor], 
        flowMonthZhi: DI_ZHI[flowMonthIdx],
        flowDayZhi: DI_ZHI[flowDayIdx],
        formulas: {
            base: baseResult.logs,
            ...logs
        }
    }
  };
};

// --- [新增] 計算每週運勢 ---
export const calculateWeeklyFortune = (engine: ZiWeiEngine): WeeklyFortune => {
    let totalCareer = 0, totalWealth = 0, totalLove = 0, totalTravel = 0, totalSocial = 0;
    const today = new Date();
    
    // 計算未來 7 天平均
    for(let i=0; i<7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const daily = calculateDailyFortune(engine, d);
        totalCareer += daily.scores.self;
        totalWealth += daily.scores.wealth;
        totalLove += daily.scores.love;
        totalTravel += daily.scores.travel;
        totalSocial += daily.scores.social;
    }

    const avg = (n: number) => Math.round(n / 7);
    const career = avg(totalCareer);
    const wealth = avg(totalWealth);
    const love = avg(totalLove);
    const travel = avg(totalTravel);
    const social = avg(totalSocial);
    const total = Math.round((career + wealth + love + travel + social) / 5);

    return {
        baseScore: 60, // 簡易模擬
        scores: {
            total,
            career,
            wealth,
            love,
            travel,
            social
        },
        guidance: {
            summary: "本週運勢平穩，適合按部就班，累積實力。",
            luckyTips: "幸運色是藍色，多喝水保持健康。"
        }
    };
};

// ---------------- Helper Functions ----------------

const getScoreTargets = (key: string, flowDayIdx: number) => {
    const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;
    switch(key) {
        case 'self': return [[getP(4), '官祿'], [getP(10), '夫妻'], [getP(0), '命宮'], [getP(8), '財帛']];
        case 'wealth': return [[getP(8), '財帛'], [getP(2), '福德'], [getP(4), '官祿'], [getP(0), '命宮']];
        case 'social': return [[getP(5), '僕役'], [getP(11), '兄弟'], [getP(1), '父母'], [getP(9), '子女']];
        case 'travel': return [[getP(9), '子女'], [getP(3), '田宅'], [getP(5), '僕役'], [getP(1), '父母']];
        case 'love': return [[getP(10), '夫妻'], [getP(4), '官祿'], [getP(6), '遷移'], [getP(2), '福德']];
        default: return [];
    }
}

interface BaseScoreParams {
    benMingPos: number; daMingPos: number; liuMingPos: number;
    birthGan: number; daGan: number; nianGan: number;
}
const calcBaseScore = (chart: ChartData, params: BaseScoreParams) => {
    let score = 50; 
    const logs: string[] = [`初始(50)`];
    
    const scanLayer = (layerName: string, mingIdx: number, mainGan: number, extraSiHuaGans: any[], extraLuGans: any[], luWeight: number) => {
        let layerScore = 0;
        const targetIndices = [mingIdx, (mingIdx + 6) % 12]; 
        targetIndices.forEach(idx => {
            if (idx < 0) return; 
            const palace = chart.palaces[idx];
            const pName = idx === mingIdx ? `${layerName}命` : `${layerName}遷`;
            const starNames = [...palace.majorStars, ...palace.minorStars, ...palace.miscStars].map(s => s.name);

            // 1. 四化
            const gansToCheck = [{ gan: mainGan, name: layerName }, ...extraSiHuaGans];
            gansToCheck.forEach(g => {
                const ganChar = TIAN_GAN[g.gan];
                const siHua = SI_HUA_MAP[ganChar];
                if (siHua) {
                    starNames.forEach(star => {
                        if (star === siHua[0]) { layerScore += 10; logs.push(`${pName}.${star}${g.name}祿(+10)`); }
                        if (star === siHua[1]) { layerScore += 5;  logs.push(`${pName}.${star}${g.name}權(+5)`); }
                        if (star === siHua[2]) { layerScore += 3;  logs.push(`${pName}.${star}${g.name}科(+3)`); }
                        if (star === siHua[3]) { layerScore -= 10; logs.push(`${pName}.${star}${g.name}忌(-10)`); }
                    });
                }
            });
            // 2. 煞星 (固定扣分)
            if (starNames.some(s => s.includes('火星'))) { layerScore -= 6; logs.push(`${pName}.火星(-6)`); }
            if (starNames.some(s => s.includes('鈴星'))) { layerScore -= 2; logs.push(`${pName}.鈴星(-2)`); }
            // 3. 祿羊陀
            const luChecks = [{ gan: mainGan, name: layerName, w: luWeight }, ...extraLuGans];
            luChecks.forEach(l => {
                const ganChar = TIAN_GAN[l.gan];
                const luIndex = LU_YANG_TUO_MAP[ganChar];
                if (luIndex !== undefined) {
                    if (luIndex === idx) { layerScore += l.w; logs.push(`${pName}.${l.name}祿存(+${l.w})`); }
                    if ((luIndex + 1) % 12 === idx) { layerScore -= 3; logs.push(`${pName}.${l.name}擎羊(-3)`); }
                    if ((luIndex + 11) % 12 === idx) { layerScore -= 3; logs.push(`${pName}.${l.name}陀羅(-3)`); }
                }
            });
        });
        score += layerScore;
        if (layerScore !== 0) logs.push(`> [${layerName}層] 小計: ${layerScore > 0 ? '+' : ''}${layerScore}`);
    };

    scanLayer('本命', params.benMingPos, params.birthGan, [], [], 2);
    scanLayer('大限', params.daMingPos, params.daGan, [], [], 3);
    scanLayer('流年', params.liuMingPos, params.nianGan, [], [{ gan: params.daGan, name: '大限', w: 3 }], 4);
    return { score, logs };
};

const calcCategoryScore = (scanner: StarScanner, targets: [number, string][], baseScore: number) => {
    let totalDelta = 0;
    const logs: string[] = [];
    targets.forEach(([idx, name]) => {
        const res = scanner.scanPalace(idx);
        if (res.score !== 0) {
            totalDelta += res.score;
            logs.push(`[${name}]: ${res.logs.join(' ')}`);
        }
    });
    let final = baseScore + totalDelta;
    if (final > 100) final = 100;
    if (final < 0) final = 0;
    if (totalDelta !== 0) logs.unshift(`基礎(${baseScore}) + 變動(${totalDelta}) = ${final}`);
    else logs.unshift(`基礎(${baseScore}) + 平運(0) = ${final}`);
    return { finalScore: Math.round(final), logs };
};

class StarScanner {
  chart: ChartData;
  params: any;

  constructor(chart: ChartData, params: any) {
    this.chart = chart;
    this.params = params;
  }

  // 用於算分
  scanPalace(palaceIdx: number): { score: number, logs: string[] } {
    let score = 0;
    const logs: string[] = [];
    const palace = this.chart.palaces[palaceIdx];
    const starsInPalace = [...palace.majorStars, ...palace.minorStars, ...palace.miscStars].map(s => s.name);

    starsInPalace.forEach(starName => {
        this.checkDynamicSiHua(starName, this.params.birthGan, 1, -1, 1, 1, '本命', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.daGan,   2, -2, 1, 1, '大限', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.nianGan, 3, -3, 2, 1, '流年', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.flowMonthGan, 4, -4, 3, 2, '流月', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.flowDayGan,   5, -5, 4, 3, '流日', (w, n) => { score += w; logs.push(n); });
        
        this.checkDynamicSiHua(starName, this.params.yueGan, 2, -3, 1, 1, '農曆月', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.riGan,  2, -3, 1, 1, '農曆日', (w, n) => { score += w; logs.push(n); });
    });

    if (starsInPalace.includes('火星')) { score -= 6; logs.push('火星(-6)'); }
    if (starsInPalace.includes('鈴星')) { score -= 2; logs.push('鈴星(-2)'); }

    if (this.isStarHere('祿存', this.params.daGan, palaceIdx)) { score += 3; logs.push('大限祿存(+3)'); }
    if (this.isStarHere('擎羊', this.params.daGan, palaceIdx)) { score -= 2; logs.push('大限擎羊(-2)'); }
    if (this.isStarHere('陀羅', this.params.daGan, palaceIdx)) { score -= 2; logs.push('大限陀羅(-2)'); }

    if (this.isStarHere('祿存', this.params.nianGan, palaceIdx)) { score += 4; logs.push('流年祿存(+4)'); }
    if (this.isStarHere('擎羊', this.params.nianGan, palaceIdx)) { score -= 1; logs.push('流年擎羊(-1)'); }
    if (this.isStarHere('陀羅', this.params.nianGan, palaceIdx)) { score -= 1; logs.push('流年陀羅(-1)'); }
    
    if (starsInPalace.includes('祿存')) { score += 2; logs.push('本命祿存(+2)'); }
    if (starsInPalace.includes('擎羊')) { score -= 3; logs.push('本命擎羊(-3)'); }
    if (starsInPalace.includes('陀羅')) { score -= 3; logs.push('本命陀羅(-3)'); }

    return { score, logs };
  }

  analyzePalace(palaceIdx: number) {
      const palace = this.chart.palaces[palaceIdx];
      const stars = [...palace.majorStars, ...palace.minorStars, ...palace.miscStars].map(s => s.name);
      const staticSha = stars.filter(s => ['火星', '鈴星', '擎羊', '陀羅'].some(sha => s.includes(sha)));
      
      const dynamicSha: string[] = [];
      if (this.isStarHere('擎羊', this.params.daGan, palaceIdx)) dynamicSha.push('大限擎羊');
      if (this.isStarHere('陀羅', this.params.daGan, palaceIdx)) dynamicSha.push('大限陀羅');
      if (this.isStarHere('擎羊', this.params.nianGan, palaceIdx)) dynamicSha.push('流年擎羊');
      if (this.isStarHere('陀羅', this.params.nianGan, palaceIdx)) dynamicSha.push('流年陀羅');
      if (this.isStarHere('擎羊', this.params.birthGan, palaceIdx) && !staticSha.some(s=>s.includes('擎羊'))) dynamicSha.push('本命擎羊');
      if (this.isStarHere('陀羅', this.params.birthGan, palaceIdx) && !staticSha.some(s=>s.includes('陀羅'))) dynamicSha.push('本命陀羅');
      
      const allSha = [...staticSha, ...dynamicSha];

      let siHuaCount = 0;
      let hasJi = false;

      const gans = [
          this.params.daGan, this.params.nianGan, 
          this.params.flowMonthGan, this.params.flowDayGan
      ];
      
      gans.forEach(g => {
          const char = TIAN_GAN[g];
          const sh = SI_HUA_MAP[char];
          if (sh) {
              stars.forEach(s => {
                   if (sh.includes(s)) {
                       siHuaCount++;
                       if (sh[3] === s) hasJi = true;
                   }
              });
          }
      });

      return { shaCount: allSha.length, shaStars: allSha, siHuaCount, hasJi };
  }

  private checkDynamicSiHua(
      starName: string, ganIdx: number, 
      luWeight: number, jiWeight: number, quanWeight: number, keWeight: number,
      layer: string, 
      apply: (w: number, log: string) => void
  ) {
      if (ganIdx === undefined || ganIdx === null) return;
      const ganChar = TIAN_GAN[ganIdx];
      const map = SI_HUA_MAP[ganChar];
      if (!map) return;
      
      if (map[0] === starName) apply(luWeight, `${starName}${layer}祿(+${luWeight})`);
      if (map[1] === starName) apply(quanWeight, `${starName}${layer}權(+${quanWeight})`);
      if (map[2] === starName) apply(keWeight, `${starName}${layer}科(+${keWeight})`);
      if (map[3] === starName) apply(jiWeight, `${starName}${layer}忌(${jiWeight})`);
  }

  private isStarHere(starType: '祿存'|'擎羊'|'陀羅', ganIdx: number, targetPalaceIdx: number): boolean {
      if (ganIdx === undefined || ganIdx === null) return false;
      const ganChar = TIAN_GAN[ganIdx];
      const luIndex = LU_YANG_TUO_MAP[ganChar];
      if (luIndex === undefined) return false;
      let actualIndex = -1;
      if (starType === '祿存') actualIndex = luIndex;
      if (starType === '擎羊') actualIndex = (luIndex + 1) % 12;
      if (starType === '陀羅') actualIndex = (luIndex + 11) % 12;
      return actualIndex === targetPalaceIdx;
  }
}

const calcTimeParameters = (chart: ChartData, date: Date) => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    const lunarYear = LunarYear.fromYear(lunar.getYear());
    const lunarStr = `${lunar.getYear()}年 ${Math.abs(lunar.getMonth())}月 ${lunar.getDay()}日`;
    const nianGan = lunar.getYearGanIndex();
    const yueGan = lunar.getMonthGanIndex(); 
    const riGan = lunar.getDayGanIndex();        
    const virtualAge = lunar.getYear() - chart.lunarYear + 1;
    const daXianPalace = chart.palaces.find(p => { const [start, end] = p.ages; return virtualAge >= start && virtualAge <= end; });
    const daGan = daXianPalace ? daXianPalace.ganIndex : 0;
    const yearZhi = lunar.getYearZhiIndex(); 
    const douJunPalace = chart.palaces[2]; 
    const douJunName = douJunPalace.name; 
    const nameIdx = PALACE_NAMES.indexOf(douJunName);
    const offset = (12 - nameIdx) % 12;
    const flowMonthAnchor = (yearZhi + offset) % 12;
    const month = Math.abs(lunar.getMonth());
    const leapMonth = lunarYear.getLeapMonth();
    let monthSteps = month - 1; 
    if (leapMonth > 0) { if (month > leapMonth) { monthSteps += 1; } else if (lunar.getMonth() < 0) { monthSteps += 1; } }
    const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;
    const day = lunar.getDay();
    const flowDayIdx = (flowMonthIdx + (day - 1)) % 12;

    return { nianGan, yueGan, riGan, daGan, virtualAge, flowYearZhi: yearZhi, flowMonthAnchor, flowDayIdx, flowMonthIdx, lunarStr };
};

const getWeather = (score: number): 'sunny' | 'cloudy' | 'rainy' => {
  if (score >= 80) return 'sunny';
  if (score >= 60) return 'cloudy';
  return 'rainy';
};

const getSummary = (score: number): string => {
  if (score >= 85) return "運勢旺盛，大展宏圖";
  if (score >= 70) return "穩健順利，漸入佳境";
  if (score >= 50) return "平平淡淡，保守為宜";
  return "波動較大，謹言慎行";
};

const getAdvice = (type: string, score: number): string => {
  if (score > 80) return "吉星拱照，強力出擊！";
  if (score > 60) return "運勢平穩，按部就班。";
  if (score > 40) return "稍有阻礙，多加留意。";
  return "煞星干擾，避開風險。";
};