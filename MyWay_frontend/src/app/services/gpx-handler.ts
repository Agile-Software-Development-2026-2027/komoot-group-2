import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class GpxHandler {
  //mock for upload gpx file
  public readonly mockGpxData: string = `
    <gpx version="1.1" creator="MyWayApp">
      <trk>
        <trkseg>
          <trkpt lat="41.8902" lon="12.4922"></trkpt> <!-- Colosseo -->
          <trkpt lat="41.8986" lon="12.4769"></trkpt> <!-- Pantheon -->
          <trkpt lat="41.9029" lon="12.4534"></trkpt> <!-- San Pietro -->
        </trkseg>
      </trk>
    </gpx>
  `;

  constructor() { }
}