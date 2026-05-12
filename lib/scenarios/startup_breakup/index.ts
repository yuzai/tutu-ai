import type { Scenario } from "../types";
import { STARTUP_BREAKUP_PLACES } from "./places";
import { STARTUP_BREAKUP_CHARACTERS } from "./characters";

export const startupBreakupScenario: Scenario = {
  id: "startup_breakup",
  name: "创业散伙饭",
  description:
    "晚上七点的私房菜包间。烧光 1500 万，账上剩 80 万的创业团队聚齐了：CEO、CTO、跑路的前 PM、要期权的设计师、要清算的投资人、操心所有人的 HR。一顿散伙饭，谁先开口谁尴尬。",
  world: {
    width: 32,
    height: 18,
    startHour: 19,
    tickMinutes: 5,
    timeOfDayHints: {
      "0-18": "餐厅没开门，不可能在这。",
      "18-19": "大家从各地往这边赶，大堂开始有人到。",
      "19-21": "入座点菜，气氛沉重客套，没人敢先开口。",
      "21-23": "主战场。算账、要期权、撕破脸、跑露台抽烟轮番上演。",
      "23-25": "散场，三三两两在大堂送别，喝多的开始说真话。",
    },
  },
  places: STARTUP_BREAKUP_PLACES,
  characters: STARTUP_BREAKUP_CHARACTERS,
};
