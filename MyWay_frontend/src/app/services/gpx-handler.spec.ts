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
});
