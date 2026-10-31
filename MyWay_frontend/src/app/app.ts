
import { Component } from '@angular/core';
import { MenuBar } from './menu-bar/menu-bar';
import { ItalyMap } from './italy-map/italy-map';
import { GpxUploadComponent } from './components/gpx-upload/gpx-upload.component';

@Component({
  selector: 'app-root',
  imports: [ItalyMap, MenuBar, GpxUploadComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
