import { supabase } from '../lib/supabaseClient';

export const authService = {
  /**
   * Deploy new participant account node in Supabase
   */
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          avatar_url:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Unlock account credentials and log in
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Revoke auth token and terminate session
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Request email reset link for lost credentials
   */
  async resetPasswordRequest(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Confirm password recovery updates
   */
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Check active authenticated session on load
   */
  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Listen for user auth status adjustments
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return subscription;
  },
};
