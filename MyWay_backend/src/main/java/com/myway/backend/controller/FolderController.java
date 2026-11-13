package com.myway.backend.controller;

import com.myway.backend.model.Folder;
import com.myway.backend.service.folder.FolderService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    // POST /api/folders -> create a new folder for a specific user (identified by email)
    @PostMapping
    public ResponseEntity<Folder> createFolder(@RequestParam String name, @RequestParam String userEmail) {
        Folder newFolder = folderService.createFolder(name, userEmail);
        return ResponseEntity.ok(newFolder);
    }

    // GET /api/folders?userEmail=... -> retrieve all folders for a specific user (identified by email)
    @GetMapping
    public ResponseEntity<List<Folder>> getFoldersByUser(@RequestParam String userEmail) {
        List<Folder> folders = folderService.getFoldersByUserEmail(userEmail);
        return ResponseEntity.ok(folders);
    }
}