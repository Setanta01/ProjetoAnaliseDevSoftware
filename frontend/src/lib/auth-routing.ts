export const AUTHENTICATED_HOME = '/app/projects'

export function isAuthenticatedAppPath(pathname: string) {
  return pathname === '/app' || pathname.startsWith('/app/')
}

export function getSessionRestoreDestination(pathname: string) {
  return isAuthenticatedAppPath(pathname) ? null : AUTHENTICATED_HOME
}
