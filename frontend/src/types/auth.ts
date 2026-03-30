import type { Role } from '@my-project/shared';

/** User entity from API */
export interface User {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: Role;
  createdAt: string;
  hasPassword: boolean;
}

/** POST /auth/login, /auth/signup response */
export interface AuthResponse {
  user: User;
}

/** POST /auth/google response */
export interface GoogleAuthResponse {
  user: User;
  isNewUser: boolean;
}

/** POST /auth/login body */
export interface LoginDto {
  email: string;
  password: string;
}

/** POST /auth/signup body */
export interface SignupDto {
  email: string;
  password: string;
  name: string;
  verificationToken: string;
}

export type EmailVerificationPurpose = 'SIGNUP' | 'RESET_PASSWORD';
