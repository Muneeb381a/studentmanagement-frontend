import { createContext, useContext, useState } from 'react';
import { login as apiLogin, logout as apiLogout } from '../api/auth';
import { tokenStorage } from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  });

  /**
   * Sign in — supports both single-tenant and multi-tenant modes.
   *
   * Single-tenant (existing):  signIn(username, password)
   * Multi-tenant (new):        signIn(username, password, school_code)
   *
   * On success the JWT payload now includes:
   *   { id, username, name, role, entity_id, schema?, school_name?, school_code? }
   *
   * `schema` is forwarded transparently in every subsequent API call via the
   * axios interceptor — no component needs to know about it.
   */
  const signIn = async (username, password, school_code = null) => {
    const body = { username, password };
    if (school_code) body.school_code = school_code;

    const res = await apiLogin(body);
    // Response is an object (not array) — axios interceptor won't unwrap it
    const payload = res.data?.data ?? res.data;
    const { accessToken, refreshToken, user: u } = payload;

    tokenStorage.setAccess(accessToken);
    tokenStorage.setRefresh(refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  /**
   * Sign out — revokes the refresh token server-side, then clears local state.
   * Errors are swallowed so a failed network call never prevents local logout.
   */
  const signOut = async () => {
    try {
      await apiLogout({ refreshToken: tokenStorage.getRefresh() });
    } catch {
      // Ignore — server may have already revoked the token
    } finally {
      tokenStorage.clear();
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
