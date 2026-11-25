package com.myway.backend.controller;

import com.myway.backend.dto.folder.FolderDTO;
import com.myway.backend.service.folder.FolderService;
import com.myway.backend.util.LoginRequired;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    // POST /api/folders?name=... -> create a folder owned by the logged-in user
    @LoginRequired
    @PostMapping
    public ResponseEntity<FolderDTO> createFolder(@RequestParam String name, Authentication authentication) {
        FolderDTO created = folderService.createFolder(name, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // GET /api/folders -> the folders of the logged-in user
    @LoginRequired
    @GetMapping
    public List<FolderDTO> getMyFolders(Authentication authentication) {
        return folderService.getFolders(authentication.getName());
    }
}
