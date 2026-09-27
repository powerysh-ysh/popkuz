export const SPACES = [
  { id: 1, name: '체험 공간 1', unlockAt: 3, token: 'k4m9' },
  { id: 2, name: '체험 공간 2', unlockAt: 4, token: 'r8t2' },
  { id: 3, name: '체험 공간 3', unlockAt: 5, token: 'w3q6' },
  { id: 4, name: '체험 공간 4', unlockAt: 5, token: 'h5n1' },
]

export function findSpace(id) {
  if (id == null) return null
  const nid = Number(id)
  return SPACES.find(s => s.id === nid) || null
}
