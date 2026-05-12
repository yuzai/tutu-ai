import type { Place, Position } from "./types";
import { ACTIVE_SCENARIO } from "./scenarios";

export const WORLD_W = ACTIVE_SCENARIO.world.width;
export const WORLD_H = ACTIVE_SCENARIO.world.height;

export const PLACES: Place[] = ACTIVE_SCENARIO.places;

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

// 一次推进多步，让 agent 每 tick 移动多格 — 走路看起来更连续。
export function stepTowardN(from: Position, to: Position, n: number): Position {
  let cur = from;
  for (let i = 0; i < n; i++) {
    if (cur.x === to.x && cur.y === to.y) break;
    cur = stepToward(cur, to);
  }
  return cur;
}

export function randomCellInPlace(p: Place): Position {
  const x = p.rect.x + Math.floor(Math.random() * p.rect.w);
  const y = p.rect.y + Math.floor(Math.random() * p.rect.h);
  return { x, y };
}

// 用于首次 SSR — 避免 hydration mismatch；位置由 seed 决定，服务端/客户端一致。
export function stableCellInPlace(p: Place, seed: string): Position {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  return {
    x: p.rect.x + (u % p.rect.w),
    y: p.rect.y + (Math.floor(u / p.rect.w) % p.rect.h),
  };
}
