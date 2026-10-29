import { Injectable } from '@angular/core';
import { LatLngExpression } from 'leaflet';

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

  public parseGpx(gpxString: string): LatLngExpression[]{
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxString, 'text/xml');
    const trackPoints = xmlDoc.getElementsByTagName('trkpt');
    const coordinates: LatLngExpression[] = [];

    //iterate on trackpoints and takes 'lat' and 'lon' attributes
    for(let i = 0; i < trackPoints.length; i++){
      const lat = parseFloat(trackPoints[i].getAttribute('lat') || '0');
      const lon = parseFloat(trackPoints[i].getAttribute('lon') || '0');

      //add point if valid
      if(lat != 0 && lon != 0){
        coordinates.push([lat, lon]);
      }
    }
    return coordinates;
  }
}