import { MonitoreoListadoDTO } from './monitoreo.model';

export interface PlantillaMonitoreo {
  id?: number;
  nombre: string;
  monitoreos: Partial<MonitoreoListadoDTO>[];
  propietarioId?: number;
}
