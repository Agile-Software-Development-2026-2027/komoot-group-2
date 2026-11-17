package com.myway.backend.service.route;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.myway.backend.service.exceptions.InvalidRouteException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Stores route GPX files and pictures on disk.
 * Returns absolute paths (stored in the database) and never trusts user filenames.
 */
@Service
public class RouteFileStorageService {

    private final Path gpxDir;
    private final Path pictureDir;

    public RouteFileStorageService(@Value("${myway.storage.base-dir}") String baseDir) {
        Path base = Path.of(baseDir).toAbsolutePath().normalize();
        this.gpxDir = base.resolve("gpx");
        this.pictureDir = base.resolve("pictures");
        try {
            Files.createDirectories(gpxDir);
            Files.createDirectories(pictureDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create storage directories", e);
        }
    }

    /** Saves a GPX file and returns its absolute path. */
    public String saveGpx(MultipartFile file) {
        byte[] bytes = readBytes(file);
        String head = new String(bytes, 0, Math.min(bytes.length, 2048), StandardCharsets.UTF_8);
        if (!head.contains("<gpx")) {
            throw new InvalidRouteException("The file is not a valid GPX file");
        }
        return write(gpxDir, UUID.randomUUID() + ".gpx", bytes);
    }

    /** Saves a picture (JPEG, PNG or WEBP) and returns its absolute path. */
    public String savePicture(MultipartFile file) {
        byte[] bytes = readBytes(file);
        String extension = detectImageExtension(bytes);
        if (extension == null) {
            throw new InvalidRouteException("The picture must be a JPEG, PNG or WEBP image");
        }
        return write(pictureDir, UUID.randomUUID() + "." + extension, bytes);
    }

    /** Deletes a stored file, only if it is inside the storage folder. Used for cleanup on failure. */
    public void deleteQuietly(String absolutePath) {
        if (absolutePath == null) {
            return;
        }
        try {
            Path path = Path.of(absolutePath).toAbsolutePath().normalize();
            if (path.startsWith(gpxDir) || path.startsWith(pictureDir)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException | RuntimeException ignored) {
            // cleanup must never hide the original error
        }
    }

    private byte[] readBytes(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidRouteException("The file is missing or empty");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read the uploaded file", e);
        }
    }

    private String write(Path directory, String filename, byte[] bytes) {
        Path target = directory.resolve(filename).normalize();
        try {
            Files.write(target, bytes);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot save the file", e);
        }
        return target.toString();
    }

    // Detects the real image type from the first bytes, not from the filename
    private String detectImageExtension(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (b.length >= 4 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return "png";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "webp";
        }
        return null;
    }
}