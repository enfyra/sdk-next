'use client'

import { useAuth, useEnfyra } from '@enfyra/sdk-next/client'

export function AuthStatus() {
  const { user, isAuthenticated, pending } = useAuth()
  const client = useEnfyra()

  return (
    <section>
      <h2>Auth Status</h2>
      <p data-testid="auth-pending">{String(pending)}</p>
      <p data-testid="auth-state">{isAuthenticated ? `logged in as ${user?.email}` : 'anonymous'}</p>
      <p data-testid="client-exists">{String(!!client)}</p>
    </section>
  )
}
