import { Role } from '@my-project/shared';

export interface UserInfo {
  id: number;
  email: string;
  name: string;
  profileImage: string | null;
  role: Role;
  createdAt: Date;
  hasPassword: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface SocialAuthResponse extends AuthResponse {
  isNewUser: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
