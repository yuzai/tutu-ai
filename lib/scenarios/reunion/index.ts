import type { Scenario } from "../types";
import { REUNION_PLACES } from "./places";
import { REUNION_CHARACTERS } from "./characters";

export const reunionScenario: Scenario = {
  id: "reunion",
  name: "十年同学会",
  description:
    "高中毕业十年聚会。北漂程序员班长、留学回来的状元、接班开宝马的富二代、离婚带娃的校花、藏粉 60 万的短视频博主、送外卖的体委、回老家教书的小镇阿姨——一桌人，一桌戏。",
  world: {
    width: 32,
    height: 18,
    startHour: 18,
    tickMinutes: 5,
    timeOfDayHints: {
      "0-17": "餐厅没开，大家还没到。",
      "17-18": "陆续赶来，大堂开始有人到。",
      "18-19": "入座寒暄、礼貌打量，每个人都在评估别人混得怎样。",
      "19-21": "主战场。吃饭，敬酒，问近况，话里全是潜台词。",
      "21-22": "饭近尾声，三三两两露台抽烟说真话。",
      "22-25": "转 KTV 续摊，谁唱什么歌能听出十年变了多少。",
    },
  },
  places: REUNION_PLACES,
  characters: REUNION_CHARACTERS,
};
