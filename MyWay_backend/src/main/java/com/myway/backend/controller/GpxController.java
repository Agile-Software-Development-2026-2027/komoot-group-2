package com.myway.backend.controller;

import com.myway.backend.service.GpxService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/gpx")
@CrossOrigin(origins = "*") // permit angular frontend to access this endpoint
public class GpxController {

    private final GpxService gpxService;

    // Dependency Injection tramite costruttore (Best Practice Spring)
    public GpxController(GpxService gpxService) {
        this.gpxService = gpxService;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadGpx(@RequestParam("file") MultipartFile file) {
        // to send the file to the service layer for validation and storage
        gpxService.salvaGpxInMemoria(file);
        
        // if the service method completes without throwing an exception, we return a success response
        return ResponseEntity.ok("File GPX uploaded and stored successfully in memory!");
    }
}

