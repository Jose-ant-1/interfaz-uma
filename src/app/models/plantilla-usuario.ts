import { UsuarioDTO } from './monitoreo.model';

export interface PlantillaUsuario {
  id?: number;
  nombre: string;
  usuarios: Partial<UsuarioDTO>[];

}
