export interface Pagina {
  id: number;
  nombre: string;
  url: string;
  estado: 'ONLINE' | 'LENTA' | 'ERROR'; // Basado en lo que hablamos del semáforo
}
