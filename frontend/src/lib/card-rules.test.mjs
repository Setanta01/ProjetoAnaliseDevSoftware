import assert from 'node:assert/strict'
import test from 'node:test'
import { canEditExecutionFields, getSprintDeadlineState, isBacklogCard } from './card-rules.ts'

test('backlog cards are suggestions without execution fields', () => {
  const backlogCard = { sprint_id: null }
  const sprintCard = { sprint_id: 11 }

  assert.equal(isBacklogCard(backlogCard), true)
  assert.equal(canEditExecutionFields(backlogCard), false)
  assert.equal(isBacklogCard(sprintCard), false)
  assert.equal(canEditExecutionFields(sprintCard), true)
})

test('late badge is based on sprint commitment, not current date', () => {
  assert.deepEqual(
    getSprintDeadlineState({ sprint_id: 12, due_date: '2026-06-01', sprint_data_inicio: '2026-06-15' }),
    { kind: 'late' },
  )
  assert.deepEqual(
    getSprintDeadlineState({ sprint_id: 12, due_date: '2026-06-15', sprint_data_inicio: '2026-06-15' }),
    { kind: 'normal' },
  )
  assert.equal(getSprintDeadlineState({ sprint_id: 12, due_date: null, sprint_data_inicio: '2026-06-15' }), null)
})
