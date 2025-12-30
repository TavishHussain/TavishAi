
export type Role = 'user' | 'ai';

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  image?: string;
}

export interface Chat {
  id: string;
  messages: Message[];
  title: string;
  createdAt: number;
}

export interface User {
  name: string;
  phone: string;
  isLoggedIn: boolean;
}

export type Theme = 'light' | 'dark';
