package com.myway.backend.graph;

import crosby.binary.file.BlockOutputStream;
import crosby.binary.osmosis.OsmosisSerializer;
import org.openstreetmap.osmosis.core.container.v0_6.NodeContainer;
import org.openstreetmap.osmosis.core.container.v0_6.WayContainer;
import org.openstreetmap.osmosis.core.domain.v0_6.CommonEntityData;
import org.openstreetmap.osmosis.core.domain.v0_6.Node;
import org.openstreetmap.osmosis.core.domain.v0_6.OsmUser;
import org.openstreetmap.osmosis.core.domain.v0_6.Tag;
import org.openstreetmap.osmosis.core.domain.v0_6.Way;
import org.openstreetmap.osmosis.core.domain.v0_6.WayNode;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;

final class OsmTestFiles {

    private OsmTestFiles() {
    }

    static Path writeSmallNetwork(Path directory) throws IOException {
        Path file = directory.resolve("small.osm.pbf");
        OsmosisSerializer serializer = new OsmosisSerializer(new BlockOutputStream(Files.newOutputStream(file)));
        serializer.initialize(Map.of());

        serializer.process(new NodeContainer(node(1, 41.000, 16.000)));
        serializer.process(new NodeContainer(node(2, 41.001, 16.000)));
        serializer.process(new NodeContainer(node(3, 41.002, 16.000)));
        serializer.process(new NodeContainer(node(4, 41.001, 16.001)));
        serializer.process(new NodeContainer(node(5, 41.003, 16.000)));
        serializer.process(new NodeContainer(node(6, 41.001, 16.002)));

        serializer.process(new WayContainer(way(100, List.of(1L, 2L, 3L), new Tag("highway", "footway"))));
        serializer.process(new WayContainer(way(101, List.of(2L, 4L), new Tag("highway", "path"))));
        serializer.process(new WayContainer(way(102, List.of(3L, 5L), new Tag("highway", "motorway"))));
        serializer.process(new WayContainer(way(103, List.of(3L, 6L),
                new Tag("highway", "residential"), new Tag("access", "private"))));
        serializer.process(new WayContainer(way(104, List.of(4L, 6L),
                new Tag("highway", "track"), new Tag("access", "private"), new Tag("foot", "yes"))));
        serializer.process(new WayContainer(way(105, List.of(1L, 4L), new Tag("building", "yes"))));
        serializer.process(new WayContainer(way(106, List.of(1L, 2L, 4L, 1L),
                new Tag("highway", "pedestrian"), new Tag("area", "yes"))));

        serializer.complete();
        serializer.close();
        return file;
    }

    private static Node node(long id, double latitude, double longitude) {
        return new Node(new CommonEntityData(id, 1, new Date(), OsmUser.NONE, 1), latitude, longitude);
    }

    private static Way way(long id, List<Long> nodeIds, Tag... tags) {
        List<WayNode> wayNodes = nodeIds.stream().map(WayNode::new).toList();
        return new Way(new CommonEntityData(id, 1, new Date(), OsmUser.NONE, 1, Arrays.asList(tags)), wayNodes);
    }
}
