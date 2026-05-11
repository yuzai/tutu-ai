import type { Place, Position } from "./types";

export const WORLD_W = 32;
export const WORLD_H = 20;

export const PLACES: Place[] = [
  {
    id: "tutu_home",
    name: "图图家",
    kind: "home",
    rect: { x: 1, y: 1, w: 6, h: 6 },
    anchor: { x: 4, y: 6 },
    color: "#ffd9b3",
    emoji: "🏠",
  },
  {
    id: "niu_home",
    name: "牛爷爷家",
    kind: "home",
    rect: { x: 8, y: 1, w: 5, h: 6 },
    anchor: { x: 10, y: 6 },
    color: "#e6c9a8",
    emoji: "🏡",
  },
  {
    id: "park",
    name: "翻斗公园",
    kind: "park",
    rect: { x: 14, y: 1, w: 8, h: 8 },
    anchor: { x: 17, y: 8 },
    color: "#bfe5a0",
    emoji: "🌳",
  },
  {
    id: "kindergarten",
    name: "翻斗幼儿园",
    kind: "kindergarten",
    rect: { x: 23, y: 1, w: 8, h: 7 },
    anchor: { x: 27, y: 7 },
    color: "#ffe17a",
    emoji: "🏫",
  },
  {
    id: "noodle_shop",
    name: "面馆",
    kind: "restaurant",
    rect: { x: 1, y: 12, w: 7, h: 6 },
    anchor: { x: 4, y: 12 },
    color: "#ffb3b3",
    emoji: "🍜",
  },
  {
    id: "convenience",
    name: "便利店",
    kind: "shop",
    rect: { x: 10, y: 12, w: 6, h: 5 },
    anchor: { x: 12, y: 12 },
    color: "#cfb3ff",
    emoji: "🏪",
  },
  {
    id: "plaza",
    name: "街心广场",
    kind: "plaza",
    rect: { x: 18, y: 11, w: 13, h: 7 },
    anchor: { x: 24, y: 14 },
    color: "#a8dadc",
    emoji: "⛲",
  },
];

export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(PLACES.map((p) => [p.id, p]));

export function getPlaceByName(name: string): Place | undefined {
  const trimmed = name.trim();
  return PLACES.find((p) => p.name === trimmed || p.id === trimmed);
}

export function placeAt(pos: Position): Place | null {
  for (const p of PLACES) {
    if (
      pos.x >= p.rect.x &&
      pos.x < p.rect.x + p.rect.w &&
      pos.y >= p.rect.y &&
      pos.y < p.rect.y + p.rect.h
    ) {
      return p;
    }
  }
  return null;
}

export function clampToWorld(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(WORLD_W - 1, pos.x)),
    y: Math.max(0, Math.min(WORLD_H - 1, pos.y)),
  };
}

export function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function stepToward(from: Position, to: Position): Position {
  if (from.x === to.x && from.y === to.y) return from;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx !== 0 && dy !== 0) {
    return Math.random() < 0.5 ? { x: from.x + dx, y: from.y } : { x: from.x, y: from.y + dy };
  }
  return { x: from.x + dx, y: from.y + dy };
}

export function randomCellInPlace(p: Place): Position {
  const x = p.rect.x + Math.floor(Math.random() * p.rect.w);
  const y = p.rect.y + Math.floor(Math.random() * p.rect.h);
  return { x, y };
}
