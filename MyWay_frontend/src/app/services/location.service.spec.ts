import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ITALY_CENTER, LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'geolocation');

  function mockGeolocation(geolocation: unknown): void {
    Object.defineProperty(globalThis.navigator, 'geolocation', { value: geolocation, configurable: true });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
  });

  afterEach(() => {
    if (original) Object.defineProperty(globalThis.navigator, 'geolocation', original);
    else delete (globalThis.navigator as unknown as Record<string, unknown>)['geolocation'];
  });

  it('should return the position given by the browser', async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((ok: PositionCallback) =>
        ok({ coords: { latitude: 45.46, longitude: 9.19 } } as GeolocationPosition),
      ),
    });
    expect(await service.getUserLocation()).toEqual({ position: { lat: 45.46, lon: 9.19 }, isFallback: false });
  });

  it('should fall back to the center of Italy when the permission is denied', async () => {
    mockGeolocation({
      getCurrentPosition: vi.fn((_ok: PositionCallback, fail: PositionErrorCallback) =>
        fail({ code: 1 } as GeolocationPositionError),
      ),
    });
    expect(await service.getUserLocation()).toEqual({ position: ITALY_CENTER, isFallback: true });
  });

  it('should fall back to the center of Italy when geolocation is not supported', async () => {
    mockGeolocation(undefined);
    expect(await service.getUserLocation()).toEqual({ position: ITALY_CENTER, isFallback: true });
  });
});
