import { TestBed } from '@angular/core/testing';
import { GpxHandler } from './gpx-handler';

describe('GpxHandler', () => {
  let service: GpxHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GpxHandler);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse valid track coordinates', () => {
    const gpx = `
      <gpx version="1.1">
        <trk><trkseg>
          <trkpt lat="41.9" lon="12.4"></trkpt>
          <trkpt lat="42.0" lon="12.5"></trkpt>
        </trkseg></trk>
      </gpx>
    `;
    const parsed = service.parseGpxString(gpx);
    expect(parsed.allCoordinates.length).toBe(2);
    expect(parsed.allCoordinates[0]).toEqual([41.9, 12.4]);
  });

  it('should parse route points (<rtept>)', () => {
    const gpx = `
      <gpx version="1.1">
        <rte>
          <rtept lat="40.8" lon="14.2"></rtept>
          <rtept lat="38.1" lon="13.3"></rtept>
        </rte>
      </gpx>
    `;
    const parsed = service.parseGpxString(gpx);
    expect(parsed.allCoordinates.length).toBe(2);
    expect(parsed.allCoordinates[0]).toEqual([40.8, 14.2]);
  });
});