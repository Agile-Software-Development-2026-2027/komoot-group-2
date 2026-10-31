
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GpxUploadComponent } from './gpx-upload.component';

describe('GpxUploadComponent', () => {
  let component: GpxUploadComponent;

  const validGpx = `
    <gpx version="1.1" creator="Test">
      <trk>
        <trkseg>
          <trkpt lat="38.9" lon="16.5"></trkpt>
          <trkpt lat="39.0" lon="16.6"></trkpt>
        </trkseg>
      </trk>
    </gpx>
  `;

  function createFile(name: string, content: string): File {
    const file = new File([content], name);

    Object.defineProperty(file, 'text', {
      value: vi.fn().mockResolvedValue(content)
    });

    return file;
  }

  async function validateFile(file: File): Promise<void> {
    const validator = component as unknown as {
      validateFile: (file: File) => Promise<void>;
    };

    await validator.validateFile(file);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GpxUploadComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(GpxUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should accept a valid GPX file', async () => {
    const file = createFile('route.gpx', validGpx);

    await validateFile(file);

    expect(component.errorMessage).toBe('');
    expect(component.successMessage).toContain('validato correttamente');
  });

  it('should reject files with an invalid extension', async () => {
    const file = createFile('route.txt', validGpx);

    await validateFile(file);

    expect(component.errorMessage).toContain('Formato non valido');
    expect(component.successMessage).toBe('');
  });

  it('should reject empty files', async () => {
    const file = createFile('empty.gpx', '');

    await validateFile(file);

    expect(component.errorMessage).toContain('vuoto');
  });

  it('should reject files larger than 10 MB', async () => {
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      'large.gpx'
    );

    await validateFile(file);

    expect(component.errorMessage).toContain('troppo grande');
  });

  it('should reject invalid XML content', async () => {
    const file = createFile('invalid.gpx', '<gpx><trkpt></gpx>');

    await validateFile(file);

    expect(component.errorMessage).toContain('XML valido');
  });

  it('should reject XML documents with a root different from gpx', async () => {
    const file = createFile(
      'invalid-root.gpx',
      '<document><point></point></document>'
    );

    await validateFile(file);

    expect(component.errorMessage).toContain('documento GPX valido');
  });

  it('should reject GPX files with fewer than two track or route points', async () => {
    const file = createFile(
      'short.gpx',
      `
        <gpx version="1.1">
          <trk>
            <trkseg>
              <trkpt lat="38.9" lon="16.5"></trkpt>
            </trkseg>
          </trk>
        </gpx>
      `
    );

    await validateFile(file);

    expect(component.errorMessage).toContain('percorso valido');
  });
});
