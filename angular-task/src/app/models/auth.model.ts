export interface RegisterDto {
  username: string;
  email: string;
  password?: string;
  role?: string;
}

export interface LoginDto {
  username: string;
  password?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
}
