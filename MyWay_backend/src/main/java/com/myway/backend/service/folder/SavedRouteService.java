package com.myway.backend.service.folder;

import com.myway.backend.model.Folder;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.repository.FolderRepository;
import com.myway.backend.repository.SavedRouteRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class SavedRouteService {

    private final SavedRouteRepository savedRouteRepository;
    private final FolderRepository folderRepository;

    public SavedRouteService(SavedRouteRepository savedRouteRepository, FolderRepository folderRepository) {
        this.savedRouteRepository = savedRouteRepository;
        this.folderRepository = folderRepository;
    }

    // Metodo per salvare una nuova rotta dentro una cartella specifica (cercata per ID)
    public SavedRoute saveRouteToFolder(Long folderId, String routeName) {
        Folder folder = folderRepository.findById(folderId)
                .orElseThrow(() -> new RuntimeException("Cartella non trovata con ID: " + folderId));
        
        SavedRoute route = new SavedRoute(routeName, folder);
        return savedRouteRepository.save(route);
    }

    // Metodo per recuperare tutte le rotte associate a una cartella
    public List<SavedRoute> getRoutesByFolderId(Long folderId) {
        return savedRouteRepository.findByFolderId(folderId);
    }
}