export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}
