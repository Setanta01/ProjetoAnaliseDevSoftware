type SprintBoundCard = {
  sprint_id?: number | null
  due_date?: string | null
  sprint_data_inicio?: string | null
}

export function isBacklogCard(card: SprintBoundCard) {
  return !card.sprint_id
}

export function getSprintDeadlineState(card: SprintBoundCard) {
  if (!card.due_date || !card.sprint_data_inicio) return null
  const committedSprint = new Date(`${card.due_date}T12:00:00`).getTime()
  const currentSprint = new Date(`${card.sprint_data_inicio}T12:00:00`).getTime()
  if (committedSprint < currentSprint) return { kind: 'late' as const }
  return { kind: 'normal' as const }
}

export function canEditExecutionFields(card: SprintBoundCard) {
  return !isBacklogCard(card)
}
