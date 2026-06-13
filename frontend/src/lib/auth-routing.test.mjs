import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTHENTICATED_HOME, getSessionRestoreDestination, isAuthenticatedAppPath } from './auth-routing.ts'

test('successful authentication has one final projects destination', () => {
  assert.equal(AUTHENTICATED_HOME, '/app/projects')
  assert.notEqual(AUTHENTICATED_HOME, '/app')
})

test('session restoration recognizes nested authenticated routes', () => {
  assert.equal(isAuthenticatedAppPath('/app/projects'), true)
  assert.equal(isAuthenticatedAppPath('/app/projects/12/board'), true)
  assert.equal(isAuthenticatedAppPath('/login'), false)
  assert.equal(getSessionRestoreDestination('/app/projects/12/board'), null)
  assert.equal(getSessionRestoreDestination('/login'), AUTHENTICATED_HOME)
})
