import type { Place } from "../../types";

export const REUNION_PLACES: Place[] = [
  {
    id: "private_room",
    name: "餐厅包间",
    kind: "restaurant",
    rect: { x: 8, y: 2, w: 14, h: 10 },
    anchor: { x: 14, y: 6 },
    color: "#f7d59a",
    emoji: "🥂",
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
    rect: { x: 23, y: 2, w: 8, h: 10 },
    anchor: { x: 26, y: 6 },
    color: "#cfeae0",
    emoji: "🚬",
  },
  {
    id: "ktv_room",
    name: "KTV 包间",
    kind: "plaza",
    rect: { x: 1, y: 13, w: 19, h: 5 },
    anchor: { x: 9, y: 15 },
    color: "#d4b8e0",
    emoji: "🎤",
  },
  {
    id: "lobby",
    name: "餐厅大堂",
    kind: "home",
    rect: { x: 21, y: 13, w: 10, h: 5 },
    anchor: { x: 25, y: 15 },
    color: "#e0d4f0",
    emoji: "🎍",
  },
];
