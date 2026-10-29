import { Component } from '@angular/core';
import { MenuBar } from './menu-bar/menu-bar';
import { ItalyMap } from './italy-map/italy-map';

@Component({
  selector: 'app-root',
  imports: [ItalyMap,MenuBar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
