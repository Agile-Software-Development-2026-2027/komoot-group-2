import { TestBed } from '@angular/core/testing';
import { TrackStyleHandler, DEFAULT_TRACK_STYLE } from './track-style-handler.service';

describe('TrackStyleHandler', () => {
  let service: TrackStyleHandler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrackStyleHandler);
  });

  it('should start with the default style', () => {
    expect(service.getCurrentStyle()).toEqual(DEFAULT_TRACK_STYLE);
  });

  it('should change the color', () => {
    service.setColor('#0000ff');
    expect(service.getCurrentStyle().color).toBe('#0000ff');
  });

  it('should change the weight', () => {
    service.setWeight(8);
    expect(service.getCurrentStyle().weight).toBe(8);
  });

  it('should keep the weight within the allowed range', () => {
    service.setWeight(100);
    expect(service.getCurrentStyle().weight).toBe(10);
    service.setWeight(-5);
    expect(service.getCurrentStyle().weight).toBe(1);
  });

  it('should reset to the default style', () => {
    service.setColor('#00ff00');
    service.setWeight(9);
    service.reset();
    expect(service.getCurrentStyle()).toEqual(DEFAULT_TRACK_STYLE);
  });
});