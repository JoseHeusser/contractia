import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Cliente con la secret key (service role): ignora RLS.
 * Solo para trabajo de servidor sin sesión de usuario, como el procesamiento
 * de contratos en segundo plano. Nunca importarlo desde código de cliente.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
