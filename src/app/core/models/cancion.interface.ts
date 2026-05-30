export interface Cancion {
  id: string;          // ID único generado para la playlist
  videoId: string;     // El ID real de YouTube (ej. dQw4w9WgXcQ)
  titulo: string;
  miniatura: string;   // URL de la imagen del video
  duracion: string;    // Ej. "03:45"
  agregadoPor: string; // Para identificar quién la pidió ("Usuario 1")
}
