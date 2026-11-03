import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { GpxHandler } from '../../services/gpx-handler';
import { GpxExportService } from '../../services/gpx-export.service';

@Component({
  selector: 'app-gpx-upload',
  standalone: true,
  imports: [],
  templateUrl: './gpx-upload.component.html',
  styleUrl: './gpx-upload.component.css'
})
export class GpxUploadComponent {

  private cdr = inject(ChangeDetectorRef);
  private gpxHandler = inject(GpxHandler);
  private gpxExportService = inject(GpxExportService);

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

    // 1. Check file extension
    if (!file.name.toLowerCase().endsWith('.gpx')) {
      this.errorMessage = 'Invalid format. Please select a GPX file.';
      return;
    }

    // 2. Check file size
    if (file.size === 0) {
      this.errorMessage = 'The selected file is empty.';
      return;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.errorMessage = 'The file is too large. The maximum allowed size is 10 MB.';
      return;
    }

    // 3. Check XML content and GPX structure
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

      // 4. Check for at least two route points
      const points = xml.getElementsByTagNameNS('*', 'trkpt');
      const routePoints = xml.getElementsByTagNameNS('*', 'rtept');

      const totalPoints = points.length + routePoints.length;

      if (totalPoints < 2) {
        this.errorMessage = 'The selected GPX file does not contain a valid route.';
        return;
      }
      await this.gpxHandler.loadGpxFile(file);

      this.gpxExportService.loadFromGpxXml(content, file.name.replace(/\.gpx$/i, ''));

      this.successMessage =
        `File "${file.name}" selected and validated successfully.`;

    } catch {
      this.errorMessage = 'An error occurred while reading the GPX file.';
    }
  }
}
