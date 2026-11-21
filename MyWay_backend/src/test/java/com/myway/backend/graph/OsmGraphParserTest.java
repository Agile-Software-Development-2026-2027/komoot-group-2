package com.myway.backend.graph;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OsmGraphParserTest {

    private static final double MILLI_DEGREE_METERS = 111.195;

    @TempDir
    Path directory;

    @Test
    void keepsOnlyTheWaysThatCanBeWalked() throws IOException {
        RoadGraph graph = OsmGraphParser.parse(OsmTestFiles.writeSmallNetwork(directory).toFile());

        assertEquals(5, graph.nodeCount());
        assertEquals(8, graph.edgeCount());
        assertEquals(Set.of(1), neighbours(graph, 0));
        assertEquals(Set.of(0, 2, 3), neighbours(graph, 1));
        assertEquals(Set.of(1), neighbours(graph, 2));
        assertEquals(Set.of(1, 4), neighbours(graph, 3));
        assertEquals(Set.of(3), neighbours(graph, 4));
    }

    @Test
    void storesCoordinatesAndEdgeLengthsInMetres() throws IOException {
        RoadGraph graph = OsmGraphParser.parse(OsmTestFiles.writeSmallNetwork(directory).toFile());

        assertEquals(41.001, graph.latitude(4), 1e-5);
        assertEquals(16.002, graph.longitude(4), 1e-5);
        int edge = graph.firstEdge(0);
        assertEquals(1, graph.edgeTarget(edge));
        assertEquals(MILLI_DEGREE_METERS, graph.edgeLength(edge), 0.5);
    }

    @Test
    void cachedGraphIsReadBackUnchanged() throws IOException {
        RoadGraph graph = OsmGraphParser.parse(OsmTestFiles.writeSmallNetwork(directory).toFile());
        Path cache = directory.resolve("small.graph");

        graph.writeTo(cache);
        RoadGraph read = RoadGraph.readFrom(cache);

        assertEquals(graph.nodeCount(), read.nodeCount());
        assertEquals(graph.edgeCount(), read.edgeCount());
        for (int node = 0; node < graph.nodeCount(); node++) {
            assertEquals(graph.latitude(node), read.latitude(node));
            assertEquals(graph.longitude(node), read.longitude(node));
            assertEquals(graph.firstEdge(node), read.firstEdge(node));
            assertEquals(graph.endEdge(node), read.endEdge(node));
        }
        for (int edge = 0; edge < graph.edgeCount(); edge++) {
            assertEquals(graph.edgeTarget(edge), read.edgeTarget(edge));
            assertEquals(graph.edgeLength(edge), read.edgeLength(edge));
        }
    }

    private static Set<Integer> neighbours(RoadGraph graph, int node) {
        Set<Integer> result = new HashSet<>();
        for (int edge = graph.firstEdge(node); edge < graph.endEdge(node); edge++) {
            result.add(graph.edgeTarget(edge));
        }
        return result;
    }
}
