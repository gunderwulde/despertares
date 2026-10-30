export interface SaveData {
  hp: number
  maxHp: number
  x: number
  y: number
  kills: number
}

export const SLOTS = 3
const key = (slot: number): string => `isla-niebla.save.${slot}`

export function loadSlot(slot: number): SaveData | null {
  try {
    const raw = localStorage.getItem(key(slot))
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<SaveData>
    if (typeof d.hp !== 'number' || typeof d.x !== 'number' || typeof d.y !== 'number') return null
    return { hp: d.hp, maxHp: d.maxHp ?? 6, x: d.x, y: d.y, kills: d.kills ?? 0 }
  } catch {
    return null
  }
}

export function saveSlot(slot: number, d: SaveData): void {
  try {
    localStorage.setItem(key(slot), JSON.stringify(d))
  } catch {
    /* storage unavailable: playing without saves */
  }
}

export function eraseSlot(slot: number): void {
  try {
    localStorage.removeItem(key(slot))
  } catch {
    /* ignore */
  }
}
