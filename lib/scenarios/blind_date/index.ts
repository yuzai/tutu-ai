import type { Scenario } from "../types";
import { BLIND_DATE_PLACES } from "./places";
import { BLIND_DATE_CHARACTERS } from "./characters";

export const blindDateScenario: Scenario = {
  id: "blind_date",
  name: "相亲饭局",
  description:
    "晚上六点的私房菜包间。32 岁公务员男 vs 28 岁国企女，双方父母 + 媒人坐定。一场全是潜台词的饭，男女不说话、妈妈交锋、爸爸们闷头喝酒，媒人忙着和稀泥。",
  world: {
    width: 32,
    height: 18,
    startHour: 18,
    tickMinutes: 5,
    timeOfDayHints: {
      "0-17": "餐厅没开门，所有人都不可能在这里。",
      "17-18": "双方在赴约路上，餐厅大堂还没人。",
      "18-19": "落座、点菜、互相打量、寒暄过场。",
      "19-21": "正餐主战场。喝酒、问问题、试探，话里全是潜台词。",
      "21-22": "饭近尾声，妈妈们开始正面交锋，爸爸们露台抽烟说真话。",
      "22-24": "散场，男女在大堂客气加微信，妈妈们各自跟媒人对底。",
    },
  },
  places: BLIND_DATE_PLACES,
  characters: BLIND_DATE_CHARACTERS,
};
