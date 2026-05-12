import type { Scenario } from "../types";
import { INLAWS_PLACES } from "./places";
import { INLAWS_CHARACTERS } from "./characters";

export const inlawsScenario: Scenario = {
  id: "inlaws",
  name: "春节家宴",
  description:
    "大年三十下午到晚上。海归儿媳第一次正式回婆家过年，婆婆在厨房战场，老公夹中间，小姑子话里带刺，6 岁孙子还会通风报信。年夜饭桌上的一场没有硝烟的战争。",
  world: {
    width: 32,
    height: 20,
    startHour: 14,
    tickMinutes: 5,
    timeOfDayHints: {
      "0-7": "深夜，全家睡了或在守岁后瘫倒。",
      "7-11": "早上，慢悠悠起床，开始准备一天。",
      "11-14": "婆婆已经在厨房忙活，午饭随便对付，年夜饭是重头。",
      "14-17": "下午，气氛在酝酿，婆婆切菜炖肉，年轻人各自缩在自己角落。",
      "17-19": "年夜饭时间，所有人围桌而坐，话题随便一起就可能爆。",
      "19-22": "饭后看春晚，红包环节，催生催婚高发期。",
      "22-24": "守岁，气氛或缓和或彻底破裂。",
    },
  },
  places: INLAWS_PLACES,
  characters: INLAWS_CHARACTERS,
};
