package com.myway.backend.controller;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/gpx")
@CrossOrigin(origins = "*") // Prevents CORS policy blocks with the frontend application
public class GpxUploadController {

    @PostMapping("/upload")
    public ResponseEntity<String> uploadGpxFile(@RequestParam("file") MultipartFile file) {
        
        // 1. Validation: Check if the uploaded file is empty
        if (file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Error: The uploaded file is empty.");
        }

        // 2. Validation: Ensure the file extension is strictly .gpx
        String fileName = file.getOriginalFilename();
        if (fileName == null || !fileName.toLowerCase().endsWith(".gpx")) {
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                    .body("Error: Unsupported file format. Please upload a valid .gpx file.");
        }

        try {
            // 3. Extraction: Read the file content as a plain text string
            // This structure will be used in Sprint 2 to parse XML coordinates
            String fileContent = new String(file.getBytes());
            
            // Server-side logging for tracking execution
            System.out.println("File successfully received in MyWay backend: " + fileName);
            System.out.println("File payload size: " + file.getSize() + " bytes");

            // Return a successful response to the frontend client
            return ResponseEntity.ok("File '" + fileName + "' successfully uploaded to the MyWay backend server!");
            
        } catch (IOException e) {
            // Error handling in case of input/output streaming failures
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: An internal server failure occurred while processing the file.");
        }
    }
}

