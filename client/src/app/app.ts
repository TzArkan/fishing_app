import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router'; // <--- Adauga RouterLink

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink], // <--- Adauga RouterLink in imports
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'fishing-client';
}