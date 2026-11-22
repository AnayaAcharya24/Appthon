import React, { createContext, useCallback, useContext, useState } from 'react';
import { apiFetch, setMemoryToken } from '../lib/api';
import type { AuthUser, Participant, JudgeProfile } from '../types/appthon';

interface AuthContextValue {
  user: AuthUser | null;
  participant: Participant | null;
  judge: JudgeProfile | null;
  loading: boolean;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [judge, setJudge] = useState<JudgeProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{
        user: AuthUser;
        participant: Participant | null;
        judge: JudgeProfile | null;
      }>('/auth/me');
      setUser(data.user);
      setParticipant(data.participant);
      setJudge(data.judge);
    } catch {
      setMemoryToken(null);
      setUser(null);
      setParticipant(null);
      setJudge(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setSession = useCallback(
    async (token: string, nextUser: AuthUser) => {
      setMemoryToken(token);
      setUser(nextUser);
      await refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setMemoryToken(null);
    setUser(null);
    setParticipant(null);
    setJudge(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, participant, judge, loading, setSession, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
