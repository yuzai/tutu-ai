import type { Place } from "../../types";

export const STARTUP_BREAKUP_PLACES: Place[] = [
  {
    id: "private_room",
    name: "包间",
    kind: "restaurant",
    rect: { x: 8, y: 2, w: 16, h: 10 },
    anchor: { x: 14, y: 6 },
    color: "#f0d4b8",
    emoji: "🍷",
  },
  {
    id: "tea_lounge",
    name: "茶水休息区",
    kind: "shop",
    rect: { x: 1, y: 2, w: 6, h: 10 },
    anchor: { x: 3, y: 6 },
    color: "#e6f0d8",
    emoji: "🍵",
  },
  {
    id: "balcony",
    name: "露台",
    kind: "park",
    rect: { x: 25, y: 2, w: 6, h: 10 },
    anchor: { x: 27, y: 6 },
    color: "#cfeae0",
    emoji: "🚬",
  },
  {
    id: "corridor",
    name: "走廊",
    kind: "home",
    rect: { x: 1, y: 13, w: 14, h: 5 },
    anchor: { x: 6, y: 15 },
    color: "#e0d4f0",
    emoji: "📞",
  },
  {
    id: "lobby",
    name: "餐厅大堂",
    kind: "plaza",
    rect: { x: 16, y: 13, w: 15, h: 5 },
    anchor: { x: 22, y: 15 },
    color: "#d6ddf0",
    emoji: "🎍",
  },
];
