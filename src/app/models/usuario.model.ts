export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  permiso?: string;
  contrasenia?: string; // Solo se usará para el envío de nuevas contraseñas
}

export interface UsuarioDTO {
  id: number;
  nombre: string;
  email: string;
  permiso: string;
}
