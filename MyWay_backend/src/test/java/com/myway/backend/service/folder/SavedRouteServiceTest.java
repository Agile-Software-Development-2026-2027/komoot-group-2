package com.myway.backend.service.folder;

import com.myway.backend.dto.gpx.PointDTO;
import com.myway.backend.dto.gpx.SaveRouteRequestDTO;
import com.myway.backend.model.Folder;
import com.myway.backend.model.SavedRoute;
import com.myway.backend.repository.FolderRepository;
import com.myway.backend.repository.SavedRouteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavedRouteServiceTest {

    @Mock private SavedRouteRepository savedRouteRepository;
    @Mock private FolderRepository folderRepository;
    @InjectMocks private SavedRouteService service;

    private static SaveRouteRequestDTO request(long folderId) {
        return new SaveRouteRequestDTO(folderId, "Giro", List.of(
                new PointDTO(1, 2, 10.0, null), new PointDTO(3, 4, null, null)));
    }

    @Test
    void savesPointsInOrderInOwnFolder() {
        Folder folder = new Folder("f", "a@x.it");
        when(folderRepository.findById(1L)).thenReturn(Optional.of(folder));
        when(savedRouteRepository.save(any(SavedRoute.class))).thenAnswer(i -> i.getArgument(0));

        SavedRoute saved = service.saveRouteToFolder(request(1L), "a@x.it");

        assertEquals(2, saved.getPoints().size());
        assertEquals(0, saved.getPoints().get(0).getPointOrder());
        assertEquals(1, saved.getPoints().get(1).getPointOrder());
    }

    @Test
    void cannotSaveIntoSomeoneElsesFolder() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(new Folder("f", "a@x.it")));

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> service.saveRouteToFolder(request(1L), "intruder@x.it"));

        assertEquals(HttpStatus.NOT_FOUND, e.getStatusCode());
        verify(savedRouteRepository, never()).save(any());
    }

    @Test
    void cannotReadSomeoneElsesRoute() {
        SavedRoute route = new SavedRoute("r", new Folder("f", "a@x.it"));
        when(savedRouteRepository.findById(5L)).thenReturn(Optional.of(route));

        assertThrows(ResponseStatusException.class, () -> service.getRouteById(5L, "intruder@x.it"));
        assertSame(route, service.getRouteById(5L, "a@x.it"));
    }

    @Test
    void cannotListSomeoneElsesFolder() {
        when(folderRepository.findById(1L)).thenReturn(Optional.of(new Folder("f", "a@x.it")));

        assertThrows(ResponseStatusException.class, () -> service.getRoutesByFolderId(1L, "intruder@x.it"));
        verify(savedRouteRepository, never()).findByFolderId(any());
    }
}
