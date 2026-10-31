import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GpxWaypoint {
  lat: number;
  lon: number;
  name?: string;
  desc?: string;
  ele?: number;
}

export interface GpxTrackSegment {
  points: [number, number][]; // [lat, lon]
}

export interface GpxTrack {
  name?: string;
  segments: GpxTrackSegment[];
}

export interface ParsedGpx {
  fileName: string;
  waypoints: GpxWaypoint[];
  tracks: GpxTrack[];
  allCoordinates: [number, number][];
}

export interface GpxNotification {
  type: 'success' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class GpxService {
  private readonly currentGpxSubject = new BehaviorSubject<ParsedGpx | null>(null);
  public readonly currentGpx$: Observable<ParsedGpx | null> = this.currentGpxSubject.asObservable();

  private readonly notificationSubject = new BehaviorSubject<GpxNotification | null>(null);
  public readonly notification$: Observable<GpxNotification | null> = this.notificationSubject.asObservable();

  private notificationTimer?: ReturnType<typeof setTimeout>;

  /**
   * Loads and validates a GPX file.
   * On success: updates currentGpx$ and notifies success.
   * On error: notifies error and throws the error.
   */
  public async loadGpxFile(file: File): Promise<ParsedGpx> {
    try {
      const parsed = await this.parseAndValidate(file);
      this.currentGpxSubject.next(parsed);
      this.showNotification({
        type: 'success',
        message: `File "${file.name}" successfully loaded!`,
      });
      return parsed;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error during the loading of GPX file';
      this.showNotification({
        type: 'error',
        message,
      });
      throw err;
    }
  }

  /**
   * Parses and validates file contents.
   */
  public async parseAndValidate(file: File): Promise<ParsedGpx> {
    // 1. Validate file existence and extension
    if (!file) {
      throw new Error('No file selected');
    }

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      throw new Error(`Filetype not supported. The file "${file.name}" is not a .gpx.`);
    }

    if (file.size === 0) {
      throw new Error('The .gpx selected is empty.');
    }

    // 2. Read content as text
    const text = await this.readFileAsText(file);

    // 3. Parse XML content
    return this.parseGpxString(text, file.name);
  }

  /**
   * Parses GPX XML text into structured ParsedGpx data.
   */
  public parseGpxString(xmlText: string, fileName = 'track.gpx'): ParsedGpx {
    if (!xmlText || xmlText.trim().length === 0) {
      throw new Error('The .gpx selected is empty.');
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    // Check for XML parsing error
    const parserErrors = xmlDoc.getElementsByTagName('parsererror');
    if (parserErrors.length > 0) {
      throw new Error('The file does not contain a valid .xml format.');
    }

    // Verify root is <gpx>
    const root = xmlDoc.documentElement;
    if (!root || root.localName.toLowerCase() !== 'gpx') {
      throw new Error('.gpx file not valid: unexpected root element.');
    }

    const waypoints = this.extractWaypoints(xmlDoc);
    const tracks = this.extractTracksAndRoutes(xmlDoc);

    const allCoordinates: [number, number][] = [];
    for (const track of tracks) {
      for (const seg of track.segments) {
        allCoordinates.push(...seg.points);
      }
    }

    if (waypoints.length === 0 && allCoordinates.length === 0) {
      throw new Error('The .gpx file does not contain any valid tracks or waypoints');
    }

    return {
      fileName,
      waypoints,
      tracks,
      allCoordinates,
    };
  }

  public showNotification(notification: GpxNotification, durationMs = 5000): void {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
    }
    this.notificationSubject.next(notification);

    if (durationMs > 0) {
      this.notificationTimer = setTimeout(() => {
        this.clearNotification();
      }, durationMs);
    }
  }

  public clearNotification(): void {
    if (this.notificationTimer) {
      clearTimeout(this.notificationTimer);
      this.notificationTimer = undefined;
    }
    this.notificationSubject.next(null);
  }

  public getCurrentGpx(): ParsedGpx | null {
    return this.currentGpxSubject.value;
  }

  private readFileAsText(file: File): Promise<string> {
    if (typeof file.text === 'function') {
      return file.text();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error during loading.'));
      reader.readAsText(file);
    });
  }

  private extractWaypoints(doc: Document): GpxWaypoint[] {
    const wptElements = this.getElementsByTag(doc, 'wpt');
    const waypoints: GpxWaypoint[] = [];

    for (const el of wptElements) {
      const latStr = el.getAttribute('lat');
      const lonStr = el.getAttribute('lon');
      if (!latStr || !lonStr) continue;

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      if (isNaN(lat) || isNaN(lon)) continue;

      const nameEl = this.getFirstElementByTag(el, 'name');
      const descEl = this.getFirstElementByTag(el, 'desc');
      const eleEl = this.getFirstElementByTag(el, 'ele');

      const name = nameEl?.textContent?.trim() || undefined;
      const desc = descEl?.textContent?.trim() || undefined;
      let ele: number | undefined;
      if (eleEl?.textContent) {
        const parsedEle = parseFloat(eleEl.textContent.trim());
        if (!isNaN(parsedEle)) {
          ele = parsedEle;
        }
      }

      waypoints.push({
        lat,
        lon,
        name,
        desc,
        ele,
      });
    }

    return waypoints;
  }

  private extractTracksAndRoutes(doc: Document): GpxTrack[] {
    const tracks: GpxTrack[] = [];

    // Extract <trk> tracks
    const trkElements = this.getElementsByTag(doc, 'trk');
    for (const trk of trkElements) {
      const nameEl = this.getFirstElementByTag(trk, 'name');
      const trackName = nameEl?.textContent?.trim() || undefined;

      const segElements = this.getElementsByTag(trk, 'trkseg');
      const segments: GpxTrackSegment[] = [];

      for (const seg of segElements) {
        const ptElements = this.getElementsByTag(seg, 'trkpt');
        const points: [number, number][] = [];

        for (const pt of ptElements) {
          const latStr = pt.getAttribute('lat');
          const lonStr = pt.getAttribute('lon');
          if (!latStr || !lonStr) continue;

          const lat = parseFloat(latStr);
          const lon = parseFloat(lonStr);
          if (!isNaN(lat) && !isNaN(lon)) {
            points.push([lat, lon]);
          }
        }

        if (points.length > 0) {
          segments.push({ points });
        }
      }

      if (segments.length > 0) {
        tracks.push({ name: trackName, segments });
      }
    }

    // Extract <rte> routes (treated as tracks)
    const rteElements = this.getElementsByTag(doc, 'rte');
    for (const rte of rteElements) {
      const nameEl = this.getFirstElementByTag(rte, 'name');
      const routeName = nameEl?.textContent?.trim() || undefined;

      const ptElements = this.getElementsByTag(rte, 'rtept');
      const points: [number, number][] = [];

      for (const pt of ptElements) {
        const latStr = pt.getAttribute('lat');
        const lonStr = pt.getAttribute('lon');
        if (!latStr || !lonStr) continue;

        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon]);
        }
      }

      if (points.length > 0) {
        tracks.push({
          name: routeName,
          segments: [{ points }],
        });
      }
    }

    return tracks;
  }

  private getElementsByTag(parent: Document | Element, tagName: string): Element[] {
    const directList = parent.getElementsByTagName(tagName);
    if (directList.length > 0) {
      return Array.from(directList);
    }
    if ('getElementsByTagNameNS' in parent) {
      const nsList = parent.getElementsByTagNameNS('*', tagName);
      if (nsList.length > 0) {
        return Array.from(nsList);
      }
    }
    return Array.from(parent.querySelectorAll('*')).filter(
      (el) => el.localName?.toLowerCase() === tagName.toLowerCase(),
    );
  }

  private getFirstElementByTag(parent: Element, tagName: string): Element | null {
    const list = this.getElementsByTag(parent, tagName);
    return list.length > 0 ? list[0] : null;
  }
}
