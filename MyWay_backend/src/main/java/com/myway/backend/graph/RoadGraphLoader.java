package com.myway.backend.graph;

import com.myway.backend.service.exceptions.RoutingUnavailableException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Slf4j
@Component
public class RoadGraphLoader {

    private final Path osmFile;
    private final Path cacheFile;
    private volatile RoadNetwork network;

    public RoadGraphLoader(@Value("${myway.routing.osm-file}") String osmFile) {
        this.osmFile = Path.of(osmFile);
        this.cacheFile = this.osmFile.resolveSibling(this.osmFile.getFileName() + ".graph");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void loadInBackground() {
        if (!Files.isRegularFile(osmFile)) {
            log.warn("Road network file {} not found: route planning is disabled", osmFile.toAbsolutePath());
            return;
        }
        Thread.ofPlatform().daemon().name("road-graph-loader").start(this::load);
    }

    public RoadNetwork getNetwork() {
        RoadNetwork loaded = network;
        if (loaded == null) {
            throw new RoutingUnavailableException();
        }
        return loaded;
    }

    void load() {
        RoadGraph graph = loadGraph();
        if (graph == null) {
            return;
        }
        long start = System.currentTimeMillis();
        try {
            network = new RoadNetwork(graph, new SegmentGrid(graph));
            log.info("Road segment grid built in {} ms", System.currentTimeMillis() - start);
        } catch (RuntimeException e) {
            log.error("Could not build the road segment grid", e);
        }
    }

    private RoadGraph loadGraph() {
        long start = System.currentTimeMillis();
        try {
            if (isCacheUpToDate()) {
                RoadGraph cached = RoadGraph.readFrom(cacheFile);
                log.info("Road network read from {} in {} ms: {} nodes, {} edges", cacheFile.toAbsolutePath(),
                        System.currentTimeMillis() - start, cached.nodeCount(), cached.edgeCount());
                return cached;
            }
        } catch (IOException e) {
            log.warn("Road network cache {} is unreadable, rebuilding it", cacheFile.toAbsolutePath(), e);
        }

        try {
            RoadGraph built = OsmGraphParser.parse(osmFile.toFile());
            log.info("Road network built from {} in {} ms: {} nodes, {} edges", osmFile.toAbsolutePath(),
                    System.currentTimeMillis() - start, built.nodeCount(), built.edgeCount());
            saveCache(built);
            return built;
        } catch (RuntimeException e) {
            log.error("Could not load the road network from {}", osmFile.toAbsolutePath(), e);
            return null;
        }
    }

    private boolean isCacheUpToDate() throws IOException {
        return Files.isRegularFile(cacheFile)
                && Files.getLastModifiedTime(cacheFile).compareTo(Files.getLastModifiedTime(osmFile)) > 0;
    }

    private void saveCache(RoadGraph built) {
        Path temporary = cacheFile.resolveSibling(cacheFile.getFileName() + ".tmp");
        try {
            built.writeTo(temporary);
            Files.move(temporary, cacheFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            log.warn("Could not save the road network cache {}", cacheFile.toAbsolutePath(), e);
        }
    }
}
