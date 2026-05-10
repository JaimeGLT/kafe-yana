export interface User {
  nombre: string;
  apellido: string;
  userName: string;
  email: string;
  celular: string;
  estado: boolean;
  rol: string;
}

export interface SessionUser {
  nombre: string;
  email: string;
  rol: string;
}