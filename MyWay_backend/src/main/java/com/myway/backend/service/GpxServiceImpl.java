package com.myway.backend.service;

import com.myway.backend.exception.GpxValidationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GpxServiceImpl implements GpxService {

    // In-memory temporary archive to store GPX files
    private final Map<String, byte[]> archivioTemporaneo = new ConcurrentHashMap<>();

    @Override
    public void salvaGpxInMemoria(MultipartFile file) {
        // Criteria 1: Check if the file is empty
        if (file == null || file.isEmpty()) {
            throw new GpxValidationException("Error: The selected file is empty!");
        }

        // Criteria 2: Validate .gpx extension
        String nomeFile = file.getOriginalFilename();
        if (nomeFile == null || !nomeFile.toLowerCase().endsWith(".gpx")) {
            throw new GpxValidationException("Error: Unsupported format. You can ONLY upload files with a .gpx extension.");
        }

        try {
            byte[] fileBytes = file.getBytes();

            // Criteria 3: Deep content validation (we look for the XML tag <gpx)
            // We only read the first 1024 bytes to avoid overloading the RAM during the check
            String anteprimaContenuto = new String(fileBytes, 0, Math.min(fileBytes.length, 1024), StandardCharsets.UTF_8);
            if (!anteprimaContenuto.contains("<gpx")) {
                throw new GpxValidationException("Error: Invalid GPX content. The file structure is not a valid GPX map route.");
            }

            // Criteria 5: If all validations pass, we store the file in the temporary in-memory archive
            archivioTemporaneo.put(nomeFile, fileBytes);
            System.out.println("[SCRUM MOCK] File salvato in RAM. Totale file: " + archivioTemporaneo.size());

        } catch (GpxValidationException e) {
            throw e; // Rilancia la nostra eccezione logica verso l'handler
        } catch (IOException e) {
            throw new RuntimeException("Error while reading file bytes: " + e.getMessage());
        }
    }
}
