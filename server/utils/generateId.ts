import { randomBytes } from 'node:crypto'

export function generateId(): string {
  return randomBytes(6).toString('base64url').slice(0, 8)
}
