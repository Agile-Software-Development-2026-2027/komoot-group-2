package com.myway.backend.controller;

import com.myway.backend.dto.GPXDataDTO;
import com.myway.backend.service.GpxService;
import com.myway.backend.service.gpxParsing.GPXParsingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/gpx")
@CrossOrigin(origins = "*")
public class GpxController {

    private final GpxService gpxService;
    private final GPXParsingService gpxParsingService;

    // Constructor injection for GpxService and GPXParsingService
    public GpxController(GpxService gpxService, GPXParsingService gpxParsingService) {
        this.gpxService = gpxService;
        this.gpxParsingService = gpxParsingService;
    }

    @PostMapping("/upload")
    public ResponseEntity<GPXDataDTO> uploadGpx(@RequestParam("file") MultipartFile file) {
        // 1. save the GPX file in memory using the gpxService
        gpxService.saveGpxInMemoria(file);
        
        // 2. Parse the GPX file to extract the map data using the gpxParsingService
        GPXDataDTO gpxData = gpxParsingService.parseGPX(file);
        
        // 3. Return the parsed GPX data as a response
        return ResponseEntity.ok(gpxData);
    }
}


