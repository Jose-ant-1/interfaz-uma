import {UsuarioDTO} from './usuario.model';

export interface MonitoreoListadoDTO {
  id: number;
  nombre: string;
  propietarioId: number;
  ultimoEstado: number | null;
  fechaUltimaRevision: string | null;
  activo: boolean;
  paginaUrl: string;
}

export interface MonitoreoDTODetalle {
  id: number;
  nombre: string;
  minutos: number;
  repeticiones: number;
  propietario: UsuarioDTO;
  ultimoEstado: number | null;
  fechaUltimaRevision: string | null;
  activo: boolean;
  invitados: UsuarioDTO[];
  paginaUrl: string;
}
