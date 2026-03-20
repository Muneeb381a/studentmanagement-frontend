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
   * Sign in — stores both access + refresh tokens and user profile.
   * The login endpoint now returns { accessToken, refreshToken, user }.
   */
  const signIn = async (username, password) => {
    const res = await apiLogin({ username, password });
    // Response is an object (not array), so the axios interceptor won't unwrap it.
    const payload = res.data?.data ?? res.data;
    const { accessToken, refreshToken, user: u } = payload;

    tokenStorage.setAccess(accessToken);
    tokenStorage.setRefresh(refreshToken);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  };

  /**
   * Sign out — revokes the refresh token on the server, then clears local state.
   * Errors are swallowed so a failed network call never prevents local logout.
   */
  const signOut = async () => {
    try {
      await apiLogout({ refreshToken: tokenStorage.getRefresh() });
    } catch {
      // Ignore — server may already have revoked the token
    } finally {
      tokenStorage.clear();
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
