import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AuthUser, PermissionCode, RoleName } from '@/types';
import { ROLE_PERMISSIONS } from '@/lib/permissions';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    organizationName: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchAuthUser(userId: string): Promise<AuthUser | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) return null;

  let organizationName: string | null = null;
  let role: RoleName | null = null;

  if (profile.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .maybeSingle();
    organizationName = org?.name ?? null;

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .eq('organization_id', profile.organization_id)
      .maybeSingle();

    if (userRole) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('name')
        .eq('id', userRole.role_id)
        .maybeSingle();
      role = (roleData?.name as RoleName) ?? null;
    }
  }

  const permissions: PermissionCode[] = role
    ? ROLE_PERMISSIONS[role] ?? []
    : [];

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    organizationId: profile.organization_id,
    organizationName,
    role,
    permissions,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!session?.user) {
      setUser(null);
      return;
    }
    const authUser = await fetchAuthUser(session.user.id);
    setUser(authUser);
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        fetchAuthUser(s.user.id).then((u) => {
          setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s: Session | null) => {
      setSession(s);
      if (s?.user) {
        (async () => {
          const u = await fetchAuthUser(s.user.id);
          setUser(u);
          setLoading(false);
        })();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: mapAuthError(error.message) };
    }
    return { error: null };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      organizationName: string,
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        return { error: mapAuthError(error.message) };
      }
      if (!data.user) {
        return { error: 'Unable to create account. Please try again.' };
      }

      const userId = data.user.id;

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          slug: organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + userId.slice(0, 8),
        })
        .select('id')
        .single();

      if (orgError) {
        return { error: 'Account created but organization setup failed. Please contact support.' };
      }

      await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', userId);

      const { data: ownerRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'OWNER')
        .maybeSingle();

      if (ownerRole) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          organization_id: org.id,
          role_id: ownerRole.id,
        });
      }

      return { error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signIn, signUp, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please check your inbox and confirm your email before signing in.';
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  return message;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { User };
