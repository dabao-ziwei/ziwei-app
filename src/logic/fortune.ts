import { ZiWeiEngine } from './engine';
import type { ChartData, Palace } from './types';
import { Solar, LunarYear } from 'lunar-typescript';
import { PALACE_NAMES } from './constants'; 

// 定義五大維度
export interface DailyFortune {
  score: number;       // 總分 (加權平均, 保留一位小數)
  weather: 'sunny' | 'cloudy' | 'rainy';
  summary: string;
  
  // 五角圖數據 (動態基礎分 + 變化分)
  scores: {
    self: number;     // 自身氣場
    social: number;   // 交友運勢
    love: number;     // 感情運勢
    travel: number;   // 外出運勢
    wealth: number;   // 理財運勢
  };

  // 每日指引 (心理學文案)
  advice: {
    self: string;
    social: string;
    love: string;
    travel: string;
    wealth: string;
  };

  // 諮詢引導 (雨天遞傘)
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
    baseScore: number;      // 基礎分
    lunarDateStr: string;   // 農曆日期
    flowYearZhi: string;    // 流年地支
    flowMonthAnchor: string;// 流月起點
    flowMonthZhi: string;   // 流月地支
    flowDayZhi: string;     // 流日地支
    formulas: {             // 各維度算式細節
        base: string[];     // 基礎分算式 (三層結構)
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

// 祿存、擎羊、陀羅表 (依天干)
// 規則: 祿前一為羊，祿後一為陀
const LU_YANG_TUO_MAP: Record<string, number> = {
  '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5,
  '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0,
};

// --- 文案庫 (Triad Copywriting Pool) ---
// 結構: [A(直覺), B(感性), C(哲理)]

const ADVICE_POOL = {
    // 1. 紅色警戒 (Bad Count >= 2)
    // 定調：煞忌成黨，宜靜不宜動，任何決定都可能是不好的
    RED_ALERT: {
        self: [
            "職場磁場混亂，多做多錯。與其盲目衝刺，不如調整呼吸，維持現狀就是最大的進步。",
            "感覺周遭充滿了不確定的變數，像在濃霧中行走。把重心放回自己身上，別急著展現成果。",
            "此刻適合沈潛。像一顆種子埋在土裡，等待風暴過去，無需強出頭，安穩即是力量。"
        ],
        wealth: [
            "市場充滿迷霧，直覺可能失準。看緊荷包，遠離誘惑，別讓情緒左右了你的錢包。",
            "看似美好的機會背後可能藏著代價。最好的投資就是按兵不動，守住就是賺到。",
            "慾望如野火，需用理智築起防火牆。今日不宜大動作，靜觀其變方為上策。"
        ],
        social: [
            "人際圈雜音較多，獨處是最高級的享受。把心門關小一點，遠離是非圈。",
            "過度的交流容易引發誤會。今天適合做個安靜的旁觀者，不用刻意融入。",
            "像刺蝟收起尖刺，回到自己的洞穴。與其在人群中感到孤獨，不如享受一個人的寧靜。"
        ],
        travel: [
            "外在變動能量強，易感阻礙。安穩的室內勝過外面的風雨，待在熟悉環境更有安全感。",
            "如果非必要，減少長途移動。今天的世界有點躁動，家是你最穩固的堡壘。",
            "行路難，不在山水，而在心境。暫緩腳步，讓心靈先抵達平靜的彼岸。"
        ],
        love: [
            "能量場不穩，一句無心話都可能被放大。沈默是金，給彼此一點空間。",
            "暫時的留白能避免摩擦。不適合討論嚴肅話題，用眼神交流勝過千言萬語。",
            "愛有時需要距離來發酵。退一步，不是冷漠，而是為了保護彼此不受情緒波及。"
        ]
    },

    // 2. 複雜訊號 (1 煞星 + 2+ 四化，且無忌)
    // 定調：吉凶混雜，表象與內在反差
    MIXED: {
        self: [
            "工作上吉凶交戰，看似機會很多，背後卻藏著陷阱。繁華背後別忽視微小警訊，魔鬼藏在細節裡。",
            "像是洗了一場三溫暖，專案進度得而復失。別太在意一時的成敗，這只是過程。",
            "越想用力抓緊權力，局勢反而流失越快。那種心有餘而力不足的拉扯感，承認極限反而能解脫。"
        ],
        wealth: [
            "財務上有進有出，左手進右手出的感覺強烈。看起來熱鬧，其實沒留住多少。",
            "投資靈感與風險並存。心裡像有兩個聲音在吵架，建議各退一步，取中庸之道。",
            "購物車裡的猶豫不決反映了內心的矛盾。這種想享受又充滿罪惡感的糾結，不如先冷靜一天。"
        ],
        social: [
            "人際關係又愛又恨，熱鬧過後感到莫名的空虛。這種反差感讓你有點不知所措。",
            "某個朋友讓你覺得很煩卻又離不開。這種矛盾的依賴關係，今天會特別明顯。",
            "在群體中想表現卻又怕受傷。這種既期待又怕受傷害的心情，讓你顯得有點彆扭。"
        ],
        travel: [
            "想出門又怕麻煩，出門了又想回家。這種反覆的心情會讓行程充滿變數。",
            "旅途中驚喜與驚嚇並存。雖然過程曲折，但事後回想起來也是一種獨特的回憶。",
            "行程安排過滿導致消化不良。想貪心地去很多地方，最後卻累壞了自己。"
        ],
        love: [
            "愛恨交織的感覺特別強烈。對方可能完全不知道，但你內心已經經歷了一場暴風雨。",
            "想靠近又想逃離，這種忽冷忽熱的態度會讓對方摸不著頭緒。試著穩定自己的情緒。",
            "關係中充滿了張力，既有甜蜜的牽絆也有窒息的壓力。這就是痛並快樂著的感覺。"
        ]
    },

    // 3. 晦暗/空缺 (無煞星，但有化忌)
    // 定調：感到失去、空缺，但非實質毀滅
    JI_ONLY: {
        self: [
            "工作上總覺得少了點什麼，像拼圖缺了一塊。這種空缺感讓你提不起勁，別太勉強自己。",
            "感覺付出與回收不成正比，一種莫名的失落感籠罩。這不是你不夠好，只是時機未到。",
            "事情看似完成了，心裡卻沒有成就感？這種空虛是暫時的，給自己一杯咖啡的時間。"
        ],
        wealth: [
            "看著餘額，心裡有一種說不出的失落。不是沒錢，而是覺得價值感流失了。",
            "錢包好像破了個小洞，雖然沒大失血，但那種守不住的無力感讓你很心累。",
            "投資市場的波動讓你感到不安，總覺得會失去什麼。這種恐懼比實際損失更折磨人。"
        ],
        social: [
            "在人群中卻感到莫名的空虛。熱鬧是他們的，你什麼也沒有。不如回家享受獨處。",
            "對某段關係感到失望，覺得曾經的熱情冷卻了。接受這份冷淡，也是一種成長。",
            "總覺得被忽略或被遺忘？這種孤單感是心靈的訊號，提醒你要更愛自己一點。"
        ],
        travel: [
            "出門在外卻覺得心無所依。原本期待的風景，看在眼裡卻是一片蒼白。",
            "行程中可能會有些小遺憾，讓你覺得這趟門出得有點不值。放寬心，遺憾也是風景。",
            "總覺得提不起勁出門？那種不想動的無力感，其實是身體在向你討休息。"
        ],
        love: [
            "明明兩個人在一起，卻感覺心隔了好遠。這種無形的距離感最傷人。",
            "總覺得好像失去了什麼，對關係感到一陣莫名的恐慌。別想太多，給彼此一點空間。",
            "心裡的缺口，對方填補不了。這種空虛感需要你自己來面對，別把期待全放在對方身上。"
        ]
    },

    // 4. 歲月靜好 (無煞無四化，且分數正常)
    PEACE: {
        self: ["歲月靜好，專注當下。沒有雜訊與意外，正是沈澱與累積實力的好時機。", "按部就班完成手邊任務，這種踏實的進度感，是你今天最大的成就來源。", "像平靜的湖面，映照出真實的自己。享受這份專注，把每件小事做到極致。"],
        wealth: ["流水不爭先，爭的是滔滔不絕。安穩的狀態最適合檢視長期規劃。", "守成即是獲利。看著平穩的數字，雖無大起大落的刺激，卻有一種厚實的安全感。", "不需冒險也能有所收穫。今天的財運像微風，雖不猛烈，但很舒適。"],
        social: ["君子之交淡如水。享受這種輕鬆自在的氛圍，不用刻意討好誰，做舒服的自己。", "沒有過多的客套與負擔，今天的人際關係像一杯溫開水，解渴又無負擔。", "平淡的交流中藏著真誠。不需要戴上面具，簡單的問候就能溫暖人心。"],
        travel: ["行雲流水，一路順風。沒有意外就是最好的安排，試著放慢腳步欣賞沿途風景。", "今天的行程像設定好的導航一樣精準。享受這份順暢，去發現平常忽略的美好。", "世界對你很溫柔。走出門，陽光和微風都在歡迎你，適合漫無目的地散步。"],
        love: ["平平淡淡才是真。不需要轟轟烈烈，兩人安靜待在同一空間就是最珍貴的默契。", "細水長流的感情最動人。即使不說話也不覺得尷尬，享受這份寧靜的陪伴。", "像午後的陽光，溫暖而不刺眼。今天適合用溫柔的態度，回應對方的存在。"]
    },

    // 5. 單一煞星 (主要宮位 1 煞星，且無忌)
    SHA_SINGLE: {
        FIRE: {
            self: ["節奏突然變快，你似乎能抓住那稍縱即逝的火花。雖然忙碌，但感覺蠻順的。", "突發狀況顯得特別顯眼，大家都在看這瞬間的變化。保持冷靜，這是你的舞台。", "忙了一陣突然冷下來，這種瞬間的落差感別太在意，調整呼吸就好。"],
            wealth: ["突然有想花錢的衝動，這股熱情來得快去得也快。只要開心，這點小錢值得。", "財務上的波動突然冒出來，雖然短暫，但很難忽略。別衝動操作，看準再下手。", "看著帳戶心裡湧上一股莫名的空虛感？別擔心，這只是情緒在作祟。"],
            social: ["跟朋友突然熱絡起來，這種氛圍挺舒服的。享受這突如其來的熱鬧吧。", "群組裡話題突然炸開，大家都在關注這瞬間的熱度。你也別缺席，湊個熱鬧。", "熱鬧過後的冷場來得太快，這種溫差讓你失落？沒關係，人總需要休息。"],
            travel: ["突然想去哪裡走走？這種不在計畫內的變動，反而更有趣。說走就走吧！", "出門在外遇到突發小插曲，就像短暫的煙火。別讓它影響心情，當作是驚喜。", "原本興致勃勃突然意興闌珊？那就順著心意回家吧，不勉強也是一種自由。"],
            love: ["兩人之間突然有種觸電的感覺，瞬間的熱度讓關係很有生氣。好好把握這份激情。", "關係中上演一齣小短劇，這份戲劇性變化讓彼此都很有感。別太嚴肅，輕鬆看待。", "氣氛突然降至冰點？這種瞬間抽離感讓你無助？給彼此一點時間冷卻就好。"]
        },
        RAM: {
            self: ["今天特別相信直覺，雖然有點衝動，但這股傻勁反而幫你打開局面。", "不加修飾的風格今天特別明顯。大家看到了你尖銳但也真實的一面，做自己就好。", "因心直口快覺得少了圓融？別懊悔，你的真誠大家都看在眼裡。"],
            wealth: ["看到喜歡的就想下手，這種不加思索的豪爽，其實讓你心情挺愉悅的。", "對金錢的直覺操作被大家看在眼裡，這份果斷有目共睹。相信你的第一直覺。", "衝動花錢後滿足感消退很快？別責怪自己，錢只是變成了你喜歡的樣子。"],
            social: ["跟朋友直來直往，沒什麼修飾，但對方似乎就喜歡你這份坦率。", "情緒反應有點大，真性情容易被放大檢視。但這就是你，懂你的人自然會懂。", "因太直率讓空氣凝結？別擔心，真正的朋友不會因為一句真話而離開。"],
            travel: ["說走就走，這種不顧慮太多的行動力，帶給你久違的自由感。去冒險吧！", "在外表現比較急躁？這份匆忙容易引起注意。試著放慢腳步，安全第一。", "硬要出門結果不如預期？這股勁沒處發洩？把它轉化為運動的能量吧。"],
            love: ["有情緒就直接表達，這種真實的碰撞反而讓關係更緊密。別悶在心裡。", "未經思考的直接，讓互動變得有些戲劇化。偶爾任性一下，也是一種情趣。", "因情緒太直接傷了氣氛？那一刻的沉默讓你孤獨？主動示軟，對方會理解的。"]
        },
        BELL: {
            self: ["雖然計畫趕不上變化，但你似乎很享受這種意料之外的驚喜感。", "職場氣氛微妙，隱藏的問題浮出檯面。你敏銳的直覺是最好的雷達。", "總覺得事情暗中起了變化？這種不踏實感是正常的，相信你的第六感。"],
            wealth: ["敏銳察覺財務暗流，這份精明讓你默默得到好處。低調是你的守財符。", "細節變化引起關注，精打細算的一面藏不住了。這沒什麼不好，這叫專業。", "感覺被隱形東西算計？損失不明顯但心裡不舒服？別想太多，只是情緒干擾。"],
            social: ["朋友間有心照不宣的默契，這種不用說破的氛圍讓你覺得很溫暖。", "話中有話、檯面下的角力變得明顯。你看破不說破，保持微笑就好。", "氣氛怪怪的，說不出的疏離感？這不是你的錯，只是磁場暫時不合。"],
            travel: ["行程微小變動，但你總能靈巧轉彎，發現不一樣的風景。隨遇而安。", "遇到預期外的小插曲，雖然不大但有存在感。把它當作旅途的調味料。", "總覺得諸事不順、卡卡的？也許是直覺叫你回家休息，聽它的準沒錯。"],
            love: ["兩人有些沒說出口的小心思，這神祕感反而讓關係更有情調。", "隱忍許久的事似乎找到出口。適度宣洩是好的，別讓委屈發酵。", "隔了一層紗、猜不透對方？這種空虛感讓你無力？別猜了，直接問吧。"]
        },
        SPIN: {
            self: ["進度雖慢，但正在經歷慢工出細活的過程。這也是種享受，別急。", "做事容易猶豫，原地打轉旁人都看在眼裡。沒關係，這叫深思熟慮。", "卡在原地動彈不得？這種時間流逝感讓你空虛？換個角度，這是老天讓你休息。"],
            wealth: ["對金錢運用猶豫，但反覆思量反而避開了浪費。你的糾結幫了你省錢。", "財務決策上的糾結顯而易見。想得多代表你在乎，給自己多點時間考慮。", "因猶豫錯失時機而遺憾？別想了，錯過的本來就不屬於你。"],
            social: ["跟朋友關係黏踢踢，這種分不開的糾纏也是深厚情誼。享受這份依賴。", "跟某人關係陷入膠著？這份糾結浮上檯面也好，正視它才能解決。", "覺得關係像消耗、拖泥帶水？心很累？也許是時候設立界線了。"],
            travel: ["在外閒晃、拖拖拉拉，這種漫無目的其實挺療癒的。偶爾迷路也是一種浪漫。", "在某處逗留很久不想走？這份留戀特別強烈。那就多待一會吧，不趕時間。", "覺得哪都不想去、原地踏步？那就別出門了，在家耍廢也是一種旅行。"],
            love: ["兩人糾纏不清，這份難分難捨的拉扯，正是感情甜蜜的證明。", "拉扯與猶豫變得明顯，糾結是有原因的。這代表你們還在乎彼此。", "陷在死胡同出不來？收放無力的疲憊感？先放手一下，讓橡皮筋恢復彈性。"]
        }
    },

    // 6. 內心戲 (次要宮位 1 煞星)
    INNER_SHA: {
        FIRE: {
            self: ["表面冷靜，心裡卻有一把無名火在燒。看什麼都有點不順眼，深呼吸，別讓火燒出來。"],
            wealth: ["突然很想花錢發洩一下？那是一種尋求瞬間快感的衝動，買個小東西犒賞自己就好。"],
            social: ["對某人的耐心瞬間歸零，心裡已經翻了無數個白眼？保持微笑，這只是暫時的煩躁。"],
            travel: ["心裡一直有種急匆匆的感覺，好像在趕時間？其實根本沒事，試著放慢腳步。"],
            love: ["突然對另一半感到一陣沒來由的厭煩？還好你忍住了，這把火來得快去得也快。"]
        },
        RAM: {
            self: ["明明做得不錯，心裡卻一直在挑剔自己？別鑽牛角尖，你已經很棒了。"],
            wealth: ["對於某次消費感到懊惱？心裡一直責怪自己太衝動？放過自己吧，錢再賺就有。"],
            social: ["覺得在社交場合被邊緣化？這是一種自找的刺痛感，其實大家都很喜歡你。"],
            travel: ["心裡有種莫名的抗拒感，覺得外面充滿敵意？這只是心靈的自我防衛機制。"],
            love: ["心裡有點受傷的感覺？像針扎一樣？給自己一個擁抱，你的感受是真實的。"]
        },
        BELL: {
            self: ["總覺得有人在背後搞鬼？這種多疑讓你神經緊繃。放鬆點，世界沒那麼複雜。"],
            wealth: ["對金錢有種莫名的危機感，總覺得哪裡會漏財？這種壓抑的直覺讓你不敢放鬆。"],
            social: ["敏銳捕捉到空氣中的尷尬？雖然大家在笑，但你心裡知道不對勁。保持距離就好。"],
            travel: ["直覺告訴你今天不太對勁？這種說不上來的陰鬱感籠罩著你。那就早點回家休息。"],
            love: ["心裡默默記了一筆帳？那些沒說出口的委屈在發酵？寫下來，然後把它燒掉。"]
        },
        SPIN: {
            self: ["一件小事在腦子裡轉了八百圈？這種思緒的便祕感讓你效率低落。先做別的事轉移注意力。"],
            wealth: ["為了幾塊錢的差價糾結半天？浪費的時間比錢還貴。閉上眼，選直覺喜歡的。"],
            social: ["對朋友的一句話反覆咀嚼？過度解讀只會讓自己陷入情緒泥沼。對方可能根本沒想那麼多。"],
            travel: ["出門前拖拖拉拉，心裡總有無數個不想動的理由？別想了，穿上鞋子直接走。"],
            love: ["想分分不開，想愛愛不下去？這種心理迴圈只有你能喊停。別跟自己過不去。"]
        }
    },

    // 7. 內心戲 - 紅色警戒 (次要宮位 Bad Count >= 2)
    INNER_RED: {
        self: ["戴著面具的疲憊感。你看起來應付自如，其實內心已經累壞了。今天別逼自己，你的心需要休息。"],
        wealth: ["金錢焦慮的暗流。雖然沒破財，但對未來的不安全感今天特別強烈。這是情緒作祟，不是真的缺錢。"],
        social: ["人群中的孤獨感。在大家面前維持形象，內心卻覺得隔了層膜。其實你只想關掉手機，誰都不理。"],
        travel: ["想動卻又動不了的拉扯。人雖在外面，心裡卻極度缺乏安全感，想窩在舒適圈。"],
        love: ["情緒勞動的極限。表面上沒事，但你心裡忍耐很久了。正在演練無數次爆發的劇本？先去喝杯水吧。"]
    },
    
    // 8. 內心戲 - 複雜訊號 (次要宮位 1煞 + 多化)
    INNER_MIXED: {
        self: ["理智與情感的拔河。腦子裡正在上演一場大戲，一邊想衝刺一邊想放棄。這種自我辯論很精彩，但也累人。"],
        wealth: ["購物車裡的猶豫不決。心裡把錢花了一百次又存回來一百次。這種想享受又充滿罪惡感的矛盾，放過自己吧。"],
        social: ["對某人的評價忽高忽低。一下覺得對方不錯，一下又覺得很假。這種內心的審判庭今天開得很勤，讓你心很累。"],
        travel: ["既想流浪又怕孤單。一方面覺得新鮮有趣，一方面又隱隱覺得不安。這是一場心靈上的三溫暖。"],
        love: ["愛恨交織的獨角戲。對方完全不知道，但你內心已經經歷了一場暴風雨。演得很累但也很過癮，不是嗎？"]
    }
};

// --- 雨天遞傘：諮詢引導文案 ---
const CONSULTATION_COPY = {
    COACH: [
        "目前的局勢確實比較複雜，就像在濃霧中開車。如果你需要一位副駕駛幫你看清路況，讓我們一起擬定突圍策略。",
        "卡關久了會磨損鬥志。有時候你需要的不只是努力，而是一個精準的戰略地圖。讓我們幫你重新定位。",
        "面對變局，猶豫是最大的成本。若想在波動中站穩腳步，你需要更專業的局勢分析。"
    ],
    THERAPIST: [
        "有些結，自己解容易越拉越緊。別讓情緒成為你的負擔，讓專業的視角為你梳理脈絡，轉機就在下一個轉念。",
        "心裡的雨下個不停？與其獨自撐傘，不如找人聊聊這場雨的成因。我們會陪你等到天晴。",
        "愛恨糾葛最傷神。當局者迷，旁觀者清。讓我們為你點一盞燈，照亮關係中的盲點。"
    ],
    MASTER: [
        "今日星象能量波動較大，雖有挑戰，亦藏轉機。若想化煞為權，掌握局勢的主動權，建議進行深度解析。",
        "命盤中的煞星不是壞事，它是強大的能量。用對了是武器，用錯了是傷痕。讓我們教你如何駕馭這股力量。",
        "運勢低迷時，正是佈局未來的好時機。蹲得越低，跳得越高。讓我們為你指引起跳的最佳時機。"
    ]
};

/**
 * 計算運勢的主函數
 */
export const calculateDailyFortune = (engine: ZiWeiEngine, date?: Date): DailyFortune => {
  const chart = engine.getChartData();
  const targetDate = date || new Date();
  
  // 每日雜湊索引 (0~2)
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

  // 4. 計算基礎分 (Base Score)
  const baseResult = calcBaseScore(chart, { benMingPos, daMingPos, liuMingPos, birthGan, daGan, nianGan });
  const baseScore = baseResult.score;

  // 5. 建立掃描器
  const scanner = new StarScanner(chart, { ...timeParams, birthGan, flowMonthGan, flowDayGan });

  // 6. 定義宮位 (主要 & 次要)
  const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;

  // 定義結構：[主要宮位, 次要宮位]
  const palaceMapping: Record<keyof DailyFortune['scores'], { main: number, sec: number }> = {
      self:   { main: getP(4), sec: getP(10) }, // 官祿 / 夫妻
      wealth: { main: getP(8), sec: getP(2) },  // 財帛 / 福德
      social: { main: getP(5), sec: getP(11) }, // 僕役 / 兄弟
      travel: { main: getP(9), sec: getP(3) },  // 子女 / 田宅
      love:   { main: getP(10), sec: getP(4) }  // 夫妻 / 官祿
  };

  // 7. 計算分數 & 生成建議
  const scores: any = {};
  const advices: any = {};
  const logs: any = {};

  let totalScore = 0;
  let hasRedAlert = false; // 是否有紅色警戒

  (Object.keys(palaceMapping) as Array<keyof typeof palaceMapping>).forEach(key => {
      const { main, sec } = palaceMapping[key];
      
      // 計算分數
      const scoreTargets = getScoreTargets(key, flowDayIdx);
      const scoreRes = calcCategoryScore(scanner, scoreTargets, baseScore);
      scores[key] = scoreRes.finalScore;
      logs[key] = scoreRes.logs;
      totalScore += scoreRes.finalScore;

      // 生成建議 (核心邏輯)
      const mainAnalysis = scanner.analyzePalace(main);
      const secAnalysis = scanner.analyzePalace(sec);

      // [關鍵] 計算負面指數 (煞星數 + (有忌? 1 : 0))
      const mainBadCount = mainAnalysis.shaCount + (mainAnalysis.hasJi ? 1 : 0);
      const secBadCount = secAnalysis.shaCount + (secAnalysis.hasJi ? 1 : 0);

      let adviceText = ADVICE_POOL.PEACE[key][dayHash]; // 預設：歲月靜好

      // Priority 1: 紅色警戒 (負面指數 >= 2: 雙煞 or 煞+忌) -> 宜靜不宜動
      if (mainBadCount >= 2) {
          adviceText = ADVICE_POOL.RED_ALERT[key][dayHash];
          hasRedAlert = true;
      }
      // Priority 2: 複雜訊號 (1煞且多化) - 這裡的 mainBadCount 必定是 1 (單煞無忌)
      else if (mainBadCount === 1 && mainAnalysis.siHuaCount >= 2) {
           adviceText = ADVICE_POOL.MIXED[key][dayHash];
      }
      // Priority 3: 單一煞星外顯 (單煞無忌)
      else if (mainBadCount === 1 && mainAnalysis.shaCount === 1) {
          const shaName = mainAnalysis.shaStars[0]; 
          let poolKey = '';
          if (shaName.includes('火')) poolKey = 'FIRE';
          else if (shaName.includes('鈴')) poolKey = 'BELL';
          else if (shaName.includes('羊')) poolKey = 'RAM';
          else if (shaName.includes('陀')) poolKey = 'SPIN';

          if (poolKey && (ADVICE_POOL.SHA_SINGLE as any)[poolKey]) {
              adviceText = (ADVICE_POOL.SHA_SINGLE as any)[poolKey][key][dayHash];
          }
      }
      // Priority 3.5: 純化忌 (無煞但有忌) -> 晦暗/空缺
      else if (mainAnalysis.shaCount === 0 && mainAnalysis.hasJi) {
           adviceText = ADVICE_POOL.JI_ONLY[key][dayHash];
      }
      // Priority 4: 內在紅色警戒 (次要 負面 >= 2)
      else if (secBadCount >= 2) {
           adviceText = ADVICE_POOL.INNER_RED[key][0]; 
      }
      // Priority 5: 內在複雜 (次要 1 煞 + 2+ 化)
      else if (secAnalysis.shaCount === 1 && secAnalysis.siHuaCount >= 2) {
           adviceText = ADVICE_POOL.INNER_MIXED[key][0];
      }
      // Priority 6: 內在單煞
      else if (secAnalysis.shaCount === 1) {
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
      }
      // 安全網：如果最後是 PEACE 但分數超低 (<60)，強制轉為晦暗
      else if (scores[key] < 60) {
           adviceText = ADVICE_POOL.JI_ONLY[key][dayHash];
      }

      advices[key] = adviceText;
  });

  const avgScore = Math.round((totalScore / 5) * 10) / 10;

  // --- 8. 雨天遞傘邏輯 (Consultation Hook) ---
  let consultationHook = null;
  const isLowScore = avgScore < 60;
  
  if (isLowScore || hasRedAlert) {
      let type: 'COACH' | 'THERAPIST' | 'MASTER' = 'MASTER';
      let reason = '運勢能量波動較大';

      // 根據最低分的項目決定推廣類型
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

  return {
    score: avgScore,
    weather: getWeather(avgScore),
    summary: getSummary(avgScore),
    scores,
    advice: advices, 
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

// ---------------- Helper Functions ----------------

// 為了算分，定義三方四正 (沿用舊邏輯)
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

  // [重要修正] 讓建議分析也能「看見」動態星曜
  analyzePalace(palaceIdx: number) {
      const palace = this.chart.palaces[palaceIdx];
      // 1. 靜態煞星
      const stars = [...palace.majorStars, ...palace.minorStars, ...palace.miscStars].map(s => s.name);
      const staticSha = stars.filter(s => ['火星', '鈴星', '擎羊', '陀羅'].some(sha => s.includes(sha)));
      
      // 2. 動態煞星 (流年/大限)
      const dynamicSha: string[] = [];
      // 檢查大限
      if (this.isStarHere('擎羊', this.params.daGan, palaceIdx)) dynamicSha.push('大限擎羊');
      if (this.isStarHere('陀羅', this.params.daGan, palaceIdx)) dynamicSha.push('大限陀羅');
      // 檢查流年
      if (this.isStarHere('擎羊', this.params.nianGan, palaceIdx)) dynamicSha.push('流年擎羊');
      if (this.isStarHere('陀羅', this.params.nianGan, palaceIdx)) dynamicSha.push('流年陀羅');
      // 檢查本命 (若不在靜態表中)
      if (this.isStarHere('擎羊', this.params.birthGan, palaceIdx) && !staticSha.some(s=>s.includes('擎羊'))) dynamicSha.push('本命擎羊');
      if (this.isStarHere('陀羅', this.params.birthGan, palaceIdx) && !staticSha.some(s=>s.includes('陀羅'))) dynamicSha.push('本命陀羅');
      
      const allSha = [...staticSha, ...dynamicSha];

      let siHuaCount = 0;
      let hasJi = false;

      // 檢查飛入的四化
      const gans = [
          this.params.daGan, this.params.nianGan, 
          this.params.flowMonthGan, this.params.flowDayGan
      ];
      
      gans.forEach(g => {
          const char = TIAN_GAN[g];
          const sh = SI_HUA_MAP[char];
          if (sh) {
              // 檢查是否有星被四化
              stars.forEach(s => {
                   if (sh.includes(s)) {
                       siHuaCount++;
                       // 檢查是否化忌 (index 3 是忌)
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