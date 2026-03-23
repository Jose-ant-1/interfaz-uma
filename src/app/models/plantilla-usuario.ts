import { UsuarioDTO } from './usuario.model';

export interface PlantillaUsuario {
  id?: number;
  nombre: string;
  usuarios: Partial<UsuarioDTO>[];

}
