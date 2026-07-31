import { createServerEnfyra } from '@enfyra/sdk-next/server'
import { AuthStatus } from './auth-status'

export default async function Home() {
  let serverData: string = 'server component rendered'

  try {
    const client = await createServerEnfyra()
    const tables = await client.from<{ id: number }>('enfyra_table').execute()
    const rows = Array.isArray(tables.data) ? tables.data : [tables.data]
    serverData = `found ${rows.length} tables`
  } catch {
    serverData = 'server query skipped (no backend)'
  }

  return (
    <main>
      <h1>Enfyra SDK Next Playground</h1>
      <p data-testid="server-data">{serverData}</p>
      <AuthStatus />
    </main>
  )
}
