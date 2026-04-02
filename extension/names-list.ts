// Curated multilingual name dictionary used for dictionary-based name detection.
// Covers English, German, French, Italian, and Swiss-specific name variants.
// Full dataset not included in this repository.

export const FIRST_NAMES = new Set<string>([
  "james","john","maria","anna","peter","thomas","david","michael",
  "sarah","emma","luca","marco","julia","laura","simon","markus",
  "hans","heidi","franz","kurt","reto","flurin","gian","andrin",
  "jean","pierre","marie","sophie","nicolas","isabelle",
]);

export const NAME_PARTICLES = new Set<string>([
  "von","van","de","der","den","le","la","di","du","zur","zum","am",
]);
