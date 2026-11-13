import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MenuBar } from './menu-bar';
import { GpxExportService } from '../services/gpx-export.service';

describe('MenuBar', () => {
  let component: MenuBar;
  let fixture: ComponentFixture<MenuBar>;
  let gpxExportService: GpxExportService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuBar],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuBar);
    component = fixture.componentInstance;
    gpxExportService = TestBed.inject(GpxExportService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open the File dropdown menu when File button is clicked', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.dropdown-menu')).toBeNull();

    const fileBtn = host.querySelector<HTMLButtonElement>('.menu-dropdown-container .menu-btn')!;
    fileBtn.click();
    fixture.detectChanges();

    const dropdown = host.querySelector('.dropdown-menu');
    expect(dropdown).toBeTruthy();

    const exportItem = dropdown?.querySelector<HTMLButtonElement>('.dropdown-item');
    expect(exportItem).toBeTruthy();
    expect(exportItem?.textContent).toContain('Export GPX');
  });

  it('should trigger GPX download and close the menu when Export GPX item is clicked', () => {
    const downloadSpy = vi.spyOn(gpxExportService, 'downloadGpx').mockReturnValue('<gpx></gpx>');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const fileBtn = host.querySelector<HTMLButtonElement>('.menu-dropdown-container .menu-btn')!;
    fileBtn.click();
    fixture.detectChanges();

    const exportItem = host.querySelector<HTMLButtonElement>('.dropdown-item')!;
    exportItem.click();
    fixture.detectChanges();

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    expect(component.isFileMenuOpen).toBe(false);
    expect(host.querySelector('.dropdown-menu')).toBeNull();
  });
});
