export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  permiso?: string; // 'ADMIN' o 'USUARIO'
  contrasenia?: string; // Solo se usará para el envío de nuevas contraseñas
}
