package com.myway.backend.service.folder;

import com.myway.backend.model.Folder;
import com.myway.backend.repository.FolderRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class FolderService {

    private final FolderRepository folderRepository;

    //inject the FolderRepository through the constructor
    public FolderService(FolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    // create and save a new folder for a specific user (identified by email)
    public Folder createFolder(String name, String userEmail) {
        Folder folder = new Folder(name, userEmail);
        return folderRepository.save(folder);
    }

    // retrieve all folders for a specific user (identified by email)
    public List<Folder> getFoldersByUserEmail(String userEmail) {
        return folderRepository.findByUserEmail(userEmail);
    }
}