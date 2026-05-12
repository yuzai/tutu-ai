import type { Place } from "../../types";

export const BLIND_DATE_PLACES: Place[] = [
  {
    id: "private_room",
    name: "包间",
    kind: "restaurant",
    rect: { x: 8, y: 2, w: 16, h: 10 },
    anchor: { x: 14, y: 6 },
    color: "#f7d59a",
    emoji: "🥢",
  },
  {
    id: "tea_lounge",
    name: "茶水休息区",
    kind: "shop",
    rect: { x: 1, y: 2, w: 6, h: 8 },
    anchor: { x: 3, y: 5 },
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
    id: "powder_room",
    name: "洗手间过道",
    kind: "home",
    rect: { x: 1, y: 11, w: 12, h: 6 },
    anchor: { x: 5, y: 13 },
    color: "#ffdeec",
    emoji: "💄",
  },
  {
    id: "lobby",
    name: "餐厅大堂",
    kind: "plaza",
    rect: { x: 14, y: 13, w: 17, h: 4 },
    anchor: { x: 22, y: 15 },
    color: "#e0d4f0",
    emoji: "🎍",
  },
];
