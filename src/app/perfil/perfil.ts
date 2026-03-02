import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.html'
})
export class PerfilComponent implements OnInit {
  private http = inject(HttpClient);

  // Guardamos la respuesta de /me aquí
  usuario = signal<any>(null);

  ngOnInit() {
    const token = localStorage.getItem('authData');

    // Configuramos la cabecera con tu token de BasicAuth
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Basic ') ? token : `Basic ${token}`
    });

    // Llamada directa al endpoint /me
    this.http.get('http://localhost:8080/api/usuarios/me', { headers }).subscribe({
      next: (data) => {
        this.usuario.set(data);
        console.log("Perfil cargado:", data);
      },
      error: (err) => console.error("Error al obtener perfil:", err)
    });
  }
}
