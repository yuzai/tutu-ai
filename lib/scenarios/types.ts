import type { CharacterPersona, Place } from "../types";

export type Scenario = {
  id: string;
  name: string;
  description: string;
  world: {
    width: number;
    height: number;
    startHour: number;       // 仿真世界一天从几点开始（tick 0 对应的时刻）
    tickMinutes: number;     // 每 tick 推进的 sim 分钟数
    timeOfDayHints?: Record<string, string>; // 可选：覆盖默认的时段提示
  };
  places: Place[];
  characters: CharacterPersona[];
};
