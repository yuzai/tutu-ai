import type { CharacterPersona } from "./types";
import { ACTIVE_SCENARIO } from "./scenarios";

export const CHARACTERS: CharacterPersona[] = ACTIVE_SCENARIO.characters;

export const CHARACTER_BY_ID: Record<string, CharacterPersona> = Object.fromEntries(
  CHARACTERS.map((c) => [c.id, c])
);

export const CHARACTER_BY_NAME: Record<string, CharacterPersona> = Object.fromEntries(
  CHARACTERS.map((c) => [c.name, c])
);
