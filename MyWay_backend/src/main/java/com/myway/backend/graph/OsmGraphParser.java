package com.myway.backend.graph;

import com.myway.backend.util.GeoUtils;
import crosby.binary.osmosis.OsmosisReader;
import org.openstreetmap.osmosis.core.container.v0_6.EntityContainer;
import org.openstreetmap.osmosis.core.domain.v0_6.Entity;
import org.openstreetmap.osmosis.core.domain.v0_6.Node;
import org.openstreetmap.osmosis.core.domain.v0_6.Tag;
import org.openstreetmap.osmosis.core.domain.v0_6.Way;
import org.openstreetmap.osmosis.core.domain.v0_6.WayNode;
import org.openstreetmap.osmosis.core.task.v0_6.Sink;

import java.io.File;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;

public final class OsmGraphParser {

    private static final Set<String> EXCLUDED_HIGHWAYS = Set.of(
            "motorway", "motorway_link", "trunk", "trunk_link", "construction", "proposed",
            "abandoned", "razed", "platform", "bus_stop", "raceway", "bus_guideway", "escape", "elevator");
    private static final Set<String> NO_ACCESS = Set.of("no", "private");

    private long[] wayNodeIds = new long[1 << 20];
    private int wayNodeCount;
    private int[] wayStarts = new int[1 << 16];
    private int wayCount;
    private int[] wayNodes;

    private long[] nodeIds;
    private float[] latitudes;
    private float[] longitudes;

    private OsmGraphParser() {
    }

    public static RoadGraph parse(File file) {
        OsmGraphParser parser = new OsmGraphParser();
        read(file, parser::collectWay);
        parser.indexNodes();
        read(file, parser::collectNode);
        return parser.buildGraph();
    }

    private static void read(File file, Consumer<Entity> consumer) {
        OsmosisReader reader = new OsmosisReader(file);
        reader.setSink(new Sink() {
            @Override
            public void initialize(Map<String, Object> metaData) {
            }

            @Override
            public void process(EntityContainer container) {
                consumer.accept(container.getEntity());
            }

            @Override
            public void complete() {
            }

            @Override
            public void close() {
            }
        });
        reader.run();
    }

    private static boolean isWalkable(Way way) {
        String highway = null;
        String foot = null;
        String access = null;
        boolean area = false;
        for (Tag tag : way.getTags()) {
            switch (tag.getKey()) {
                case "highway" -> highway = tag.getValue();
                case "foot" -> foot = tag.getValue();
                case "access" -> access = tag.getValue();
                case "area" -> area = "yes".equals(tag.getValue());
                default -> {
                }
            }
        }
        if (highway == null || area || EXCLUDED_HIGHWAYS.contains(highway)) {
            return false;
        }
        String footAccess = foot != null ? foot : access;
        return footAccess == null || !NO_ACCESS.contains(footAccess);
    }

    private void collectWay(Entity entity) {
        if (!(entity instanceof Way way) || way.getWayNodes().size() < 2 || !isWalkable(way)) {
            return;
        }
        List<WayNode> nodes = way.getWayNodes();
        if (wayNodeCount + nodes.size() > wayNodeIds.length) {
            wayNodeIds = Arrays.copyOf(wayNodeIds, Math.max(wayNodeIds.length * 2, wayNodeCount + nodes.size()));
        }
        if (wayCount + 2 > wayStarts.length) {
            wayStarts = Arrays.copyOf(wayStarts, wayStarts.length * 2);
        }
        wayStarts[wayCount++] = wayNodeCount;
        for (WayNode node : nodes) {
            wayNodeIds[wayNodeCount++] = node.getNodeId();
        }
        wayStarts[wayCount] = wayNodeCount;
    }

    private void indexNodes() {
        long[] sorted = Arrays.copyOf(wayNodeIds, wayNodeCount);
        Arrays.parallelSort(sorted);
        int distinct = 0;
        for (int i = 0; i < sorted.length; i++) {
            if (i == 0 || sorted[i] != sorted[i - 1]) {
                sorted[distinct++] = sorted[i];
            }
        }
        nodeIds = Arrays.copyOf(sorted, distinct);

        wayNodes = new int[wayNodeCount];
        for (int i = 0; i < wayNodeCount; i++) {
            wayNodes[i] = Arrays.binarySearch(nodeIds, wayNodeIds[i]);
        }
        wayNodeIds = null;

        latitudes = new float[distinct];
        longitudes = new float[distinct];
        Arrays.fill(latitudes, Float.NaN);
        Arrays.fill(longitudes, Float.NaN);
    }

    private void collectNode(Entity entity) {
        if (entity instanceof Node node) {
            int index = Arrays.binarySearch(nodeIds, node.getId());
            if (index >= 0) {
                latitudes[index] = (float) node.getLatitude();
                longitudes[index] = (float) node.getLongitude();
            }
        }
    }

    private RoadGraph buildGraph() {
        int nodeCount = nodeIds.length;
        int[] firstEdge = new int[nodeCount + 1];
        forEachSegment((from, to) -> {
            firstEdge[from + 1]++;
            firstEdge[to + 1]++;
        });
        for (int i = 0; i < nodeCount; i++) {
            firstEdge[i + 1] += firstEdge[i];
        }

        int[] edgeTargets = new int[firstEdge[nodeCount]];
        float[] edgeLengths = new float[edgeTargets.length];
        int[] nextEdge = Arrays.copyOf(firstEdge, nodeCount);
        forEachSegment((from, to) -> {
            float length = (float) GeoUtils.haversineMeters(
                    latitudes[from], longitudes[from], latitudes[to], longitudes[to]);
            edgeTargets[nextEdge[from]] = to;
            edgeLengths[nextEdge[from]++] = length;
            edgeTargets[nextEdge[to]] = from;
            edgeLengths[nextEdge[to]++] = length;
        });
        return new RoadGraph(latitudes, longitudes, firstEdge, edgeTargets, edgeLengths);
    }

    private void forEachSegment(SegmentConsumer consumer) {
        for (int way = 0; way < wayCount; way++) {
            for (int i = wayStarts[way]; i < wayStarts[way + 1] - 1; i++) {
                int from = wayNodes[i];
                int to = wayNodes[i + 1];
                if (from != to && !Float.isNaN(latitudes[from]) && !Float.isNaN(latitudes[to])) {
                    consumer.accept(from, to);
                }
            }
        }
    }

    private interface SegmentConsumer {
        void accept(int from, int to);
    }
}
