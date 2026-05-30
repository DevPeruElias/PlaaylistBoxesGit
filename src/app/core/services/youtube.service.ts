import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class YoutubeService {
  private apiUrl = 'https://playlistbox-backend.onrender.com/api/youtube';

  constructor(private http: HttpClient) {}

  buscarCancion(query: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/search`, {
      params: { q: query }
    });
  }
}
