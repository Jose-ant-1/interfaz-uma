import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html'
})
export class Layout {
  // Cambia esto a 'USER' para probar la vista de Arturo
  userRole = signal('ADMIN');
  username = signal('Arturo');
}
