import type { Scenario } from "../types";
import { TUTU_PLACES } from "./places";
import { TUTU_CHARACTERS } from "./characters";

export const tutuScenario: Scenario = {
  id: "tutu",
  name: "翻斗大杂院",
  description: "《大耳朵图图》经典场景：胡图图、爸妈、牛爷爷、幼儿园同学和那只叫小怪的猫。",
  world: {
    width: 32,
    height: 20,
    startHour: 7,
    tickMinutes: 5,
  },
  places: TUTU_PLACES,
  characters: TUTU_CHARACTERS,
};
