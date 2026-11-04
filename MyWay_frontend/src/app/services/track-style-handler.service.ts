import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TrackStyle {
  color: string;
  weight: number;
}

export const DEFAULT_TRACK_STYLE: TrackStyle = {
  color: '#e63946',
  weight: 5,
};

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 10;

@Injectable({
  providedIn: 'root',
})
export class TrackStyleHandler {
  private readonly styleSubject = new BehaviorSubject<TrackStyle>({ ...DEFAULT_TRACK_STYLE });
  public readonly style$: Observable<TrackStyle> = this.styleSubject.asObservable();

  public getCurrentStyle(): TrackStyle {
    return this.styleSubject.value;
  }

  public setColor(color: string): void {
    this.styleSubject.next({ ...this.styleSubject.value, color });
  }

  public setWeight(weight: number): void {
    const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weight));
    this.styleSubject.next({ ...this.styleSubject.value, weight: clamped });
  }

  public reset(): void {
    this.styleSubject.next({ ...DEFAULT_TRACK_STYLE });
  }
}