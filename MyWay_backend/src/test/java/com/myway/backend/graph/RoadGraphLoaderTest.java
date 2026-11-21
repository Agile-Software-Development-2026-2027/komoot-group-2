package com.myway.backend.graph;

import com.myway.backend.service.exceptions.RoutingUnavailableException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoadGraphLoaderTest {

    @TempDir
    Path directory;

    @Test
    void graphIsUnavailableWhenTheMapFileIsMissing() {
        RoadGraphLoader loader = new RoadGraphLoader(directory.resolve("missing.osm.pbf").toString());

        loader.loadInBackground();

        assertThrows(RoutingUnavailableException.class, loader::getNetwork);
    }

    @Test
    void firstLoadBuildsTheCacheAndTheNextOneReusesIt() throws IOException {
        Path osmFile = writeMapFile(Instant.now().minus(Duration.ofHours(1)));
        Path cacheFile = directory.resolve("small.osm.pbf.graph");

        RoadGraphLoader first = new RoadGraphLoader(osmFile.toString());
        first.load();
        assertEquals(5, first.getNetwork().graph().nodeCount());
        assertTrue(Files.isRegularFile(cacheFile));
        FileTime cacheTime = Files.getLastModifiedTime(cacheFile);

        RoadGraphLoader second = new RoadGraphLoader(osmFile.toString());
        second.load();
        assertEquals(5, second.getNetwork().graph().nodeCount());
        assertEquals(cacheTime, Files.getLastModifiedTime(cacheFile));
    }

    @Test
    void cacheIsRebuiltWhenTheMapFileIsNewer() throws IOException {
        Path osmFile = writeMapFile(Instant.now().minus(Duration.ofHours(1)));
        Path cacheFile = directory.resolve("small.osm.pbf.graph");
        new RoadGraphLoader(osmFile.toString()).load();
        FileTime cacheTime = Files.getLastModifiedTime(cacheFile);

        Files.setLastModifiedTime(osmFile, FileTime.from(Instant.now().plus(Duration.ofHours(1))));
        RoadGraphLoader loader = new RoadGraphLoader(osmFile.toString());
        loader.load();

        assertEquals(5, loader.getNetwork().graph().nodeCount());
        assertNotEquals(cacheTime, Files.getLastModifiedTime(cacheFile));
    }

    private Path writeMapFile(Instant modified) throws IOException {
        Path osmFile = OsmTestFiles.writeSmallNetwork(directory);
        Files.setLastModifiedTime(osmFile, FileTime.from(modified));
        return osmFile;
    }
}
