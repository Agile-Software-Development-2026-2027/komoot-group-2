import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItalyMap } from './italy-map';

describe('ItalyMap', () => {
  let component: ItalyMap;
  let fixture: ComponentFixture<ItalyMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItalyMap],
    }).compileComponents();

    fixture = TestBed.createComponent(ItalyMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
