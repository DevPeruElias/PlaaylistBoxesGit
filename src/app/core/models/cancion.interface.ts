// En tu cancion.interface.ts
export interface Cancion {
  id: string;
  title: string;
  videoId: string;
  thumbnail: string;
  agregadoPor?: string;
  duration?: number; // <--- AGREGA ESTA LÍNEA
}
