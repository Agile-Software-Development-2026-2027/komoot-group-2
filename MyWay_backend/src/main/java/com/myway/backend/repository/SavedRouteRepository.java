package com.myway.backend.repository;

import com.myway.backend.model.SavedRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SavedRouteRepository extends JpaRepository<SavedRoute, Long> {

    //this method will find all saved routes that belong to a specific folder by its ID
    List<SavedRoute> findByFolderId(Long folderId);
}