/**
 * Route-map line colours, one per unit, cycled across the course. Tokyo-Metro
 * inspired - each hue is distinct on the light platform ground and legible as a
 * roundel border. Presentation only; nothing in the scheduler depends on this.
 */
const LINE_COLORS = [
  '#0a8ea0', // teal
  '#e60027', // red
  '#f39700', // orange
  '#0f9d58', // green
  '#8f76d6', // violet
  '#0079c2', // blue
  '#e5006e', // magenta
  '#9b7b2f', // gold
] as const

/** Deterministic colour for a unit by its 1-based index. */
export function lineColor(index: number): string {
  return LINE_COLORS[(index - 1) % LINE_COLORS.length]
}
