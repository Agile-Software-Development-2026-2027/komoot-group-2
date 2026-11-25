package com.myway.backend.dto.folder;

import com.myway.backend.model.Folder;

/** Folder data returned to the client (never contains the owner's email). */
public record FolderDTO(Long id, String name) {
    public static FolderDTO from(Folder folder) {
        return new FolderDTO(folder.getId(), folder.getName());
    }
}
