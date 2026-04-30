import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { externalSupabase } from '@/lib/externalSupabase';
import { apiVerifyAdmin, apiVerifySession } from '@/lib/api';

interface AuthUser {
  id: string | null;
  email: string;
  isAdmin?: boolean;
  emailConfirmed?: boolean;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  currentUserName: string;
  userRole: string | null;
  sessionToken: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string, schoolId: string | null, teacherId: string | null) => Promise<{ error?: string; needsTerms?: boolean }>;
  adminLogin: (secretKey: string) => Promise<{ error?: string }>;
  forgotPassword: (email: string) => Promise<{ error?: string }>;
  resetPassword: (newPassword: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  acceptTerms: () => Promise<{ error?: string }>;
  termsAccepted: boolean;
  showTermsModal: boolean;
  setShowTermsModal: (v: boolean) => void;
  emailConfirmed: boolean;
  selectedCharacter: 'leo' | 'milo' | null;
  selectCharacter: (character: 'leo' | 'milo') => Promise<{ error?: string } | void>;
  isPro: boolean;
  isProLoading: boolean;
  refreshProStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<'leo' | 'milo' | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isProLoading, setIsProLoading] = useState(false);

  const refreshProStatus = useCallback(async () => {
    if (!currentUser?.id) {
      setIsPro(false);
      return;
    }
    setIsProLoading(true);
    try {
      const { data: profile } = await externalSupabase
        .from('profiles')
        .select('plan')
        .eq('id', currentUser.id)
        .single();
      setIsPro(profile?.plan === 'pro');
    } catch {
      setIsPro(false);
    } finally {
      setIsProLoading(false);
    }
  }, [currentUser?.id]);

  // Fetch Pro status once whenever the authenticated user changes (per app load).
  // No localStorage / cookie caching — always fresh after reload.
  useEffect(() => {
    if (currentUser?.id && !currentUser.isAdmin) {
      refreshProStatus();
    } else if (currentUser?.isAdmin) {
      setIsPro(true);
    } else {
      setIsPro(false);
    }
  }, [currentUser?.id, currentUser?.isAdmin, refreshProStatus]);

  const checkEmailConfirmed = (user: any): boolean => {
    if (user?.email_confirmed_at) return true;
    if (user?.confirmed_at) return true;
    return false;
  };

  const checkExistingSession = useCallback(async () => {
    const savedRole = localStorage.getItem('userRole');
    const savedToken = localStorage.getItem('sessionToken');

    if (savedRole === 'admin' && savedToken) {
      try {
        const data = await apiVerifySession(savedRole, savedToken);
        if (data.valid) {
          setUserRole('admin');
          setSessionToken(savedToken);
          setCurrentUserName('Admin');
          setCurrentUser({ isAdmin: true, email: 'admin@system', id: null, emailConfirmed: true });
          setTermsAccepted(true);
          setEmailConfirmed(true);
          setSelectedCharacter('leo');
          setIsLoading(false);
          return;
        }
      } catch {}
      localStorage.removeItem('userRole');
      localStorage.removeItem('sessionToken');
    }

    try {
      const { data: { session }, error } = await externalSupabase.auth.getSession();
      if (error || !session?.user) {
        setIsLoading(false);
        return;
      }

      const isConfirmed = checkEmailConfirmed(session.user);
      setEmailConfirmed(isConfirmed);
      setCurrentUser({ id: session.user.id, email: session.user.email || '', emailConfirmed: isConfirmed });
      setUserRole('user');

      const { data: profile } = await externalSupabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setCurrentUserName(profile.display_name || 'Friend');
        setSelectedCharacter(profile.selected_character || null);
        if (profile.terms_accepted) {
          setTermsAccepted(true);
        } else {
          setShowTermsModal(true);
        }
      } else {
        const metaName = session.user.user_metadata?.display_name;
        setCurrentUserName(metaName || 'Friend');
        setTermsAccepted(true);
        setEmailConfirmed(true);
      }
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkExistingSession();

    const { data: { subscription } } = externalSupabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserRole(null);
        setCurrentUserName('');
        setTermsAccepted(false);
        setEmailConfirmed(false);
        setSelectedCharacter(null);
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const isConfirmed = checkEmailConfirmed(session.user);
        setEmailConfirmed(isConfirmed);
        if (currentUser) {
          setCurrentUser(prev => prev ? { ...prev, emailConfirmed: isConfirmed } : prev);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [checkExistingSession]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await externalSupabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        return { error: 'Please confirm your email address first. Check your inbox for the confirmation link, then sign in.' };
      }
      return { error: error.message };
    }

    if (data.user) {
      const isConfirmed = checkEmailConfirmed(data.user);
      setEmailConfirmed(isConfirmed);
      setCurrentUser({ id: data.user.id, email: data.user.email || '', emailConfirmed: isConfirmed });
      setUserRole('user');

      if (!isConfirmed) {
        return { error: 'Please confirm your email address first. Check your inbox for the confirmation link, then sign in.' };
      }

      const { data: profile } = await externalSupabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profile) {
        setCurrentUserName(profile.display_name || 'Friend');
        setSelectedCharacter(profile.selected_character || null);
        if (!profile.terms_accepted) {
          setShowTermsModal(true);
          return {};
        }
        setTermsAccepted(true);
      } else {
        const metaName = data.user.user_metadata?.display_name;
        setCurrentUserName(metaName || 'Friend');
        setTermsAccepted(true);
        setEmailConfirmed(true);
      }
    }
    return {};
  };

  const signUp = async (email: string, password: string, name: string, schoolId: string | null, teacherId: string | null) => {
    const { data, error } = await externalSupabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error) return { error: error.message };

    if (data.user) {
      const isConfirmed = checkEmailConfirmed(data.user);
      setEmailConfirmed(isConfirmed);
      setCurrentUser({ id: data.user.id, email: data.user.email || '', emailConfirmed: isConfirmed });
      setCurrentUserName(name);
      setUserRole('user');

      try {
        await externalSupabase.from('profiles').insert([{
          id: data.user.id,
          display_name: name,
          school_id: schoolId === 'personal' ? null : schoolId,
          assigned_teacher_id: schoolId === 'personal' ? null : teacherId,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
        }]);
      } catch {}

      setTermsAccepted(true);
    }
    return {};
  };

  const adminLogin = async (secretKey: string) => {
    try {
      const result = await apiVerifyAdmin(secretKey);
      if (result.isAdmin) {
        await externalSupabase.auth.signOut();
        setCurrentUser({ isAdmin: true, email: 'admin@system', id: null, emailConfirmed: true });
        setCurrentUserName('Admin');
        setUserRole('admin');
        setEmailConfirmed(true);
        setSelectedCharacter('leo');
        const token = 'admin-' + Date.now();
        setSessionToken(token);
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('sessionToken', token);
        setTermsAccepted(true);
        return {};
      }
      return { error: 'Invalid admin secret key' };
    } catch {
      return { error: 'Verification failed. Please try again.' };
    }
  };

  const forgotPassword = async (email: string) => {
    const { error } = await externalSupabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) return { error: error.message };
    return {};
  };

  const resetPassword = async (newPassword: string) => {
    const { error } = await externalSupabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    await externalSupabase.auth.signOut();
    return {};
  };

  const logout = async () => {
    if (currentUser?.id && !currentUser.isAdmin) {
      await externalSupabase.auth.signOut();
    }
    setUserRole(null);
    setSessionToken(null);
    setCurrentUser(null);
    setCurrentUserName('');
    setTermsAccepted(false);
    setShowTermsModal(false);
    setEmailConfirmed(false);
    setSelectedCharacter(null);
    sessionStorage.removeItem('userNickname');
    localStorage.removeItem('userRole');
    localStorage.removeItem('sessionToken');
  };

  const acceptTerms = async () => {
    if (!currentUser?.id) return { error: 'Not authenticated' };
    const { error } = await externalSupabase
      .from('profiles')
      .update({ terms_accepted: true, terms_accepted_at: new Date().toISOString() })
      .eq('id', currentUser.id);
    if (error) return { error: error.message };
    setTermsAccepted(true);
    setShowTermsModal(false);
    return {};
  };

  const selectCharacter = async (character: 'leo' | 'milo') => {
    if (!currentUser?.id) return { error: 'Not authenticated' };
    const { error } = await externalSupabase
      .from('profiles')
      .update({ selected_character: character })
      .eq('id', currentUser.id);
    if (error) return { error: error.message };
    setSelectedCharacter(character);
    return {};
  };

  return (
    <AuthContext.Provider value={{
      currentUser, currentUserName, userRole, sessionToken, isLoading,
      signIn, signUp, adminLogin, forgotPassword, resetPassword, logout,
      acceptTerms, termsAccepted, showTermsModal, setShowTermsModal,
      emailConfirmed, selectedCharacter, selectCharacter,
      isPro, isProLoading, refreshProStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
