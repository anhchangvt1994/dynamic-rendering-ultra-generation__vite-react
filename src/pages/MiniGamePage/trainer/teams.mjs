// Up to ten named teams per trainer; one is active and is the `team` the game uses.
// The database's trainer_save_teams() applies the same limits.
export const TEAMS_MAX = 10
export const NAME_MAX = 20

export const cleanName = (name, slot) => {
  const text = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim()
  return text || `Đội ${slot}`
}

const bySlot = (a, b) => a.slot - b.slot

/** Teams from the server rows; none yet: team 1 holds the old single team. */
export function normalizeTeams(rows, legacy = []) {
  if (!rows?.length) return [{ slot: 1, name: 'Đội 1', members: [...legacy] }]
  return rows
    .map((r) => ({ slot: r.slot, name: cleanName(r.name, r.slot), members: trim(r.members) }))
    .sort(bySlot)
}

/** One more team in the lowest free slot; null at the limit. */
export function addTeam(teams) {
  if (teams.length >= TEAMS_MAX) return null
  const slot = Array.from({ length: TEAMS_MAX }, (_, i) => i + 1).find((s) => !teams.some((t) => t.slot === s))
  return [...teams, { slot, name: `Đội ${slot}`, members: [] }].sort(bySlot)
}

export const removeTeam = (teams, slot) =>
  teams.length <= 1 ? teams : teams.filter((t) => t.slot !== slot)

const edit = (teams, slot, fn) => teams.map((t) => (t.slot === slot ? fn(t) : t))

// members is positional: index = slot in the team, null = an empty slot between Pokémon
const trim = (m) => {
  const out = [...m]
  while (out.length && out.at(-1) == null) out.pop()
  return out
}
export const countOf = (team) => team.members.filter((m) => m != null).length

/** Put a Pokémon in the first empty slot (or the next one); false when the team is full. */
const place = (members, id, limit) => {
  const hole = members.findIndex((m) => m == null)
  if (hole >= 0 && hole < limit) return Object.assign([...members], { [hole]: id })
  return members.length < limit ? [...members, id] : null
}

/** Add or remove a Pokémon in one team. Removing leaves its slot empty; a full team stays as it is. */
export const toggleMember = (teams, slot, id, limit) =>
  edit(teams, slot, (t) => {
    if (t.members.includes(id)) return { ...t, members: trim(t.members.map((m) => (m === id ? null : m))) }
    const next = place(t.members, id, limit)
    return next ? { ...t, members: next } : t
  })

/** Add a Pokémon at an exact slot; a filled slot is replaced. Unchanged when it is already in, or the team is full. */
export const putAt = (teams, slot, id, index, limit) =>
  edit(teams, slot, (t) => {
    if (t.members.includes(id) || index < 0 || index >= limit) return t
    const m = [...t.members]
    while (m.length < index) m.push(null)
    if (m[index] == null && m.filter((x) => x != null).length >= limit) return t
    m[index] = id
    return { ...t, members: trim(m) }
  })

export const renameTeam = (teams, slot, name) =>
  edit(teams, slot, (t) => ({ ...t, name: cleanName(name, slot) }))

/** The slots of the teams a Pokémon is in. */
export const membership = (teams, id) => teams.filter((t) => t.members.includes(id)).map((t) => t.slot)

/** The active slot if that team still exists, else the first team. */
export const activeOf = (teams, active) =>
  teams.some((t) => t.slot === active) ? active : (teams[0]?.slot ?? 1)

/** Drag within a team: onto a filled slot swaps, onto an empty slot moves exactly there. */
export function reorderMember(teams, slot, from, to) {
  const team = teams.find((t) => t.slot === slot)
  if (!team || from === to || from < 0 || from >= team.members.length || team.members[from] == null) return teams
  const m = [...team.members]
  while (m.length <= to) m.push(null)
  ;[m[from], m[to]] = [m[to], m[from]]
  return edit(teams, slot, (t) => ({ ...t, members: trim(m) }))
}

/** Drag onto another team: the Pokémon leaves a hole in `from` and takes the first free slot in `to`. */
export function moveToTeam(teams, from, to, id, limit) {
  const src = teams.find((t) => t.slot === from)
  const dst = teams.find((t) => t.slot === to)
  if (!src || !dst || from === to || !src.members.includes(id) || dst.members.includes(id)) return teams
  const placed = place(dst.members, id, limit)
  if (!placed) return teams
  return teams.map((t) =>
    t.slot === from ? { ...t, members: trim(t.members.map((m) => (m === id ? null : m))) } : t.slot === to ? { ...t, members: placed } : t
  )
}
