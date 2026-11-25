package com.myway.backend.service.folder;

import com.myway.backend.dto.folder.FolderDTO;
import com.myway.backend.model.Folder;
import com.myway.backend.repository.FolderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;

    public FolderDTO createFolder(String name, String userEmail) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder name must not be empty");
        }
        return FolderDTO.from(folderRepository.save(new Folder(name.trim(), userEmail)));
    }

    public List<FolderDTO> getFolders(String userEmail) {
        return folderRepository.findByUserEmail(userEmail).stream().map(FolderDTO::from).toList();
    }
}
