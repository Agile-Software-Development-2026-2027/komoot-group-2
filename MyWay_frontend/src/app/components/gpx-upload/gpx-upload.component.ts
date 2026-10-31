
import { Component, ChangeDetectorRef, inject } from '@angular/core';

@Component({
  selector: 'app-gpx-upload',
  standalone: true,
  imports: [],
  templateUrl: './gpx-upload.component.html',
  styleUrl: './gpx-upload.component.css'
})
export class GpxUploadComponent {

  private cdr = inject(ChangeDetectorRef);

  isDragOver = false;
  errorMessage = '';
  successMessage = '';

  // Dimensione massima consentita: 10 MB
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isDragOver = false;

    const files = event.dataTransfer?.files;

    if (!files || files.length === 0) {
      this.errorMessage = 'Nessun file selezionato.';
      this.successMessage = '';
      this.cdr.detectChanges();
      return;
    }

    this.validateFile(files[0]).finally(() => {
      this.cdr.detectChanges();
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = `Controllo del file "${file.name}" in corso...`;

    // Aggiorna subito la schermata
    this.cdr.detectChanges();

    this.validateFile(file).finally(() => {
      this.cdr.detectChanges();
    });

    // Permette di selezionare nuovamente lo stesso file
    input.value = '';
  }

  private async validateFile(file: File): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    // 1. Controllo estensione
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      this.errorMessage = 'Formato non valido. Seleziona un file GPX.';
      return;
    }

    // 2. Controllo dimensione
    if (file.size === 0) {
      this.errorMessage = 'Il file selezionato è vuoto.';
      return;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.errorMessage = 'Il file è troppo grande. La dimensione massima consentita è 10 MB.';
      return;
    }

    // 3. Controllo contenuto XML e struttura GPX
    try {
      const content = await file.text();

      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'application/xml');

      const parserError = xml.querySelector('parsererror');

      if (parserError) {
        this.errorMessage = 'Il file GPX non contiene un XML valido.';
        return;
      }

      const root = xml.documentElement;

      if (!root || root.localName.toLowerCase() !== 'gpx') {
        this.errorMessage = 'Il file selezionato non contiene un documento GPX valido.';
        return;
      }

      // 4. Controllo presenza di almeno due punti di percorso
      const points = xml.getElementsByTagNameNS('*', 'trkpt');
      const routePoints = xml.getElementsByTagNameNS('*', 'rtept');

      const totalPoints = points.length + routePoints.length;

      if (totalPoints < 2) {
        this.errorMessage = 'Il file GPX non contiene un percorso valido.';
        return;
      }

      this.successMessage =
        `File "${file.name}" selezionato e validato correttamente.`;

    } catch {
      this.errorMessage = 'Errore durante la lettura del file GPX.';
    }
  }
}
