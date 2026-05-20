import { redirect } from 'next/navigation';
import { resolveSessionFromEmail, getDemoSession, allowDemoAuth } from '@tradeos/auth';
import { createSupabaseServerClient } from './supabase-server';

export async function requirePageSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user?.email) {
    try {
      return await resolveSessionFromEmail(data.user.email);
    } catch {
      redirect('/onboarding/pending');
    }
  }

  if (allowDemoAuth()) {
    return getDemoSession();
  }

  redirect('/login');
}
