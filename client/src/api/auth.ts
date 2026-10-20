import { api } from './client';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export const authApi = {
  me: () => api.get<{ user: AuthUser }>('/auth/me'),
  register: (email: string, displayName: string) => api.post<{ ok: true }>('/auth/register', { email, displayName }),
  resendVerification: (email: string) => api.post<{ ok: true }>('/auth/resend-verification', { email }),
  verifyByToken: (token: string) => api.post<{ ok: true; verificationTicket: string }>('/auth/verify-token', { token }),
  verifyByCode: (email: string, code: string) =>
    api.post<{ ok: true; verificationTicket: string }>('/auth/verify-code', { email, code }),
  setPassword: (verificationTicket: string, password: string) =>
    api.post<{ ok: true; user: AuthUser }>('/auth/set-password', { verificationTicket, password }),
  login: (email: string, password: string) => api.post<{ ok: true; user: AuthUser }>('/auth/login', { email, password }),
  logout: () => api.post<{ ok: true }>('/auth/logout'),
};
