import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GpxExportService, RouteData } from './gpx-export.service';

describe('GpxExportService', () => {
  let service: GpxExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GpxExportService);
  });

  it('should be created with default route data', () => {
    expect(service).toBeTruthy();
    expect(service.hasRoute()).toBe(true);
    expect(service.route().points.length).toBeGreaterThanOrEqual(2);
  });

  it('should generate a valid GPX 1.1 XML string containing the track', () => {
    const route: RouteData = {
      name: 'Alpine Trail',
      points: [
        { lat: 45.8326, lon: 6.8652, ele: 1035, name: 'Chamonix' },
        { lat: 45.7864, lon: 6.9746, ele: 1224, name: 'Courmayeur' },
      ],
    };

    const gpxXml = service.generateGpx(route);

    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxXml, 'application/xml');

    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.localName).toBe('gpx');
    expect(doc.documentElement.getAttribute('version')).toBe('1.1');

    const trk = doc.getElementsByTagNameNS('*', 'trk')[0];
    expect(trk).toBeTruthy();

    const trkpts = doc.getElementsByTagNameNS('*', 'trkpt');
    expect(trkpts.length).toBe(2);
    expect(trkpts[0].getAttribute('lat')).toBe('45.8326');
    expect(trkpts[0].getAttribute('lon')).toBe('6.8652');
    expect(trkpts[0].getElementsByTagNameNS('*', 'ele')[0]?.textContent).toBe('1035');
    expect(trkpts[0].getElementsByTagNameNS('*', 'name')[0]?.textContent).toBe('Chamonix');
  });

  it('should escape XML special characters in route and point names', () => {
    const route: RouteData = {
      name: 'Rock & Roll <Trail> "1"',
      points: [
        { lat: 41.0, lon: 12.0, name: 'Point A & B <Start>' },
        { lat: 41.5, lon: 12.5 },
      ],
    };

    const gpxXml = service.generateGpx(route);
    const parser = new DOMParser();
    const doc = parser.parseFromString(gpxXml, 'application/xml');

    expect(doc.querySelector('parsererror')).toBeNull();
    const trkName = doc
      .getElementsByTagNameNS('*', 'trk')[0]
      .getElementsByTagNameNS('*', 'name')[0]?.textContent;
    expect(trkName).toBe('Rock & Roll <Trail> "1"');
  });

  it('should load route points from uploaded GPX XML', () => {
    const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1" creator="Test">
        <trk>
          <name>Uploaded Track</name>
          <trkseg>
            <trkpt lat="40.1" lon="15.2"><ele>150</ele></trkpt>
            <trkpt lat="40.2" lon="15.3"><ele>200</ele></trkpt>
          </trkseg>
        </trk>
      </gpx>`;

    service.loadFromGpxXml(sampleGpx);

    expect(service.route().name).toBe('Uploaded Track');
    expect(service.route().points).toEqual([
      { lat: 40.1, lon: 15.2, ele: 150 },
      { lat: 40.2, lon: 15.3, ele: 200 },
    ]);
  });

  it('should trigger a browser download with a .gpx file when downloadGpx is called', () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost/mock-gpx');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const gpxContent = service.downloadGpx('My Custom Route');

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectUrlSpy.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toContain('application/gpx+xml');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:http://localhost/mock-gpx');
    expect(gpxContent).toContain('<gpx version="1.1"');
    expect(gpxContent).toContain('<trk>');

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
