import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GpxService } from './gpx.service';

describe('GpxService', () => {
  let service: GpxService;

  beforeEach(() => {
    service = TestBed.inject(GpxService);
  });

  it('should read the elevation of track points, null where missing', () => {
    const gpx = service.parseGpxString(`
      <gpx xmlns="http://www.topografix.com/GPX/1/1">
        <trk><trkseg>
          <trkpt lat="45.0" lon="7.0"><ele>1200.5</ele></trkpt>
          <trkpt lat="45.1" lon="7.1"></trkpt>
          <trkpt lat="45.2" lon="7.2"><ele>1350</ele></trkpt>
        </trkseg></trk>
      </gpx>`);

    expect(gpx.tracks[0].segments[0]).toEqual({
      points: [[45, 7], [45.1, 7.1], [45.2, 7.2]],
      elevations: [1200.5, null, 1350],
    });
  });

  it('should leave out elevations when no point has one', () => {
    const gpx = service.parseGpxString(`
      <gpx><rte>
        <rtept lat="41.9" lon="12.5"></rtept>
        <rtept lat="41.8" lon="12.4"></rtept>
      </rte></gpx>`);

    expect(gpx.tracks[0].segments[0]).toEqual({ points: [[41.9, 12.5], [41.8, 12.4]] });
  });
});
