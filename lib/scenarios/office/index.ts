import type { Scenario } from "../types";
import { OFFICE_PLACES } from "./places";
import { OFFICE_CHARACTERS } from "./characters";

export const officeScenario: Scenario = {
  id: "office",
  name: "科技公司一日",
  description: "6 个角色（老板、PM、工程师、设计师、实习生、前台）的一天工作日。开会、写代码、催稿、八卦。",
  world: {
    width: 32,
    height: 20,
    startHour: 9,
    tickMinutes: 5,
    timeOfDayHints: {
      "0-6": "深夜，公司空荡荡，没人会在工位上。",
      "6-9": "清晨，员工还在上班路上或刚到公司。",
      "9-12": "上午工作时段，开晨会、写代码、做设计、回邮件。",
      "12-14": "午饭时间，大家去吃饭或在休息区。",
      "14-17": "下午工作时段，开会和赶进度。",
      "17-19": "傍晚下班点，开始有人收拾走人，PM 还在收尾。",
      "19-22": "加班时间，留下来的人在工位或会议室冲刺。",
      "22-24": "深夜了，正常应该回家了。",
    },
  },
  places: OFFICE_PLACES,
  characters: OFFICE_CHARACTERS,
};
