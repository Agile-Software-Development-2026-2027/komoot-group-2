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
            return ResponseEntity.badRequest().body("Errore: Il file selezionato è vuoto!");
        }

        // 2. CONTROLLO ESTENSIONE: Accetta solo file .gpx
        String nomeFile = file.getOriginalFilename();
        if (nomeFile == null || !nomeFile.toLowerCase().endsWith(".gpx")) {
            return ResponseEntity.badRequest().body("Errore: Formato non supportato. Puoi caricare SOLO file con estensione .gpx");
        }

        try {
            // 3. Legge e mostra il contenuto se il file è valido
            String contenutoGpx = new String(file.getBytes(), StandardCharsets.UTF_8);
            
            String risposta = "OK, file .gpx caricato con successo!\n\n--- CONTENUTO VISUALIZZATO ---\n" + contenutoGpx;
            return ResponseEntity.ok(risposta);
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Errore durante la lettura del file: " + e.getMessage());
        }
    }
}
