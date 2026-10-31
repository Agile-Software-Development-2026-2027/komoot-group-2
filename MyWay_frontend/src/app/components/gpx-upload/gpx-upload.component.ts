
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

  // maximum file size in bytes (10 MB)
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
    this.successMessage = `Checking file "${file.name}"...`;

    // update the view to show the checking message before starting validation
    this.cdr.detectChanges();

    this.validateFile(file).finally(() => {
      this.cdr.detectChanges();
    });

    // permit to select the same file again
    input.value = '';
  }

  private async validateFile(file: File): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    // 1. Controllo estensione
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      this.errorMessage = 'Invalid format. Please select a GPX file.';
      return;
    }

    // 2. Controllo dimensione
    if (file.size === 0) {
      this.errorMessage = 'The selected file is empty.';
      return;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.errorMessage = 'The file is too large. The maximum allowed size is 10 MB.';
      return;
    }

    // 3. Controllo contenuto XML e struttura GPX
    try {
      const content = await file.text();

      const parser = new DOMParser();
      const xml = parser.parseFromString(content, 'application/xml');

      const parserError = xml.querySelector('parsererror');

      if (parserError) {
        this.errorMessage = 'The selected file does not contain a valid XML.';
        return;
      }

      const root = xml.documentElement;

      if (!root || root.localName.toLowerCase() !== 'gpx') {
        this.errorMessage = 'The selected file is not a valid GPX document.';
        return;
      }

      // 4. Controllo presenza di almeno due punti di percorso
      const points = xml.getElementsByTagNameNS('*', 'trkpt');
      const routePoints = xml.getElementsByTagNameNS('*', 'rtept');

      const totalPoints = points.length + routePoints.length;

      if (totalPoints < 2) {
        this.errorMessage = 'The selected GPX file does not contain a valid route.';
        return;
      }

      this.successMessage =
        `File "${file.name}" selected and validated successfully.`;

    } catch {
      this.errorMessage = 'An error occurred while reading the GPX file.';
    }
  }
}
