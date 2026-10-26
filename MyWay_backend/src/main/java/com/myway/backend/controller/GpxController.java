package com.myway.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/gpx")
public class GpxController {

    @PostMapping("/upload")
    public ResponseEntity<String> caricaEVisualizzaGpx(@RequestParam("file") MultipartFile file) {
        // 1. Controlla se il file è vuoto
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Error: The selected file is empty!");
        }

        // 2. CONTROLLO ESTENSIONE: Accetta solo file .gpx
        String nomeFile = file.getOriginalFilename();
        if (nomeFile == null || !nomeFile.toLowerCase().endsWith(".gpx")) {
            return ResponseEntity.badRequest().body("Error: Unsupported format. You can ONLY upload files with a .gpx extension.");
        }

        try {
            // 3. Legge e mostra il contenuto se il file è valido
            String contenutoGpx = new String(file.getBytes(), StandardCharsets.UTF_8);
            
            String risposta = " .gpx file uploaded successfully!\n\n--- DISPLAYED CONTENT ---\n" + contenutoGpx;
            return ResponseEntity.ok(risposta);
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error while reading the file: " + e.getMessage());
        }
    }
}
