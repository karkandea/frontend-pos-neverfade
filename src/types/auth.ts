export type Role = "owner" | "admin" | "kasir";

export interface User {
  id: string;
  nama: string;
  username: string;
  role: Role;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
