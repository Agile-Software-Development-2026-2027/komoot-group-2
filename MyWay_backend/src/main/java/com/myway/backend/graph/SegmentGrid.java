package com.myway.backend.graph;

import com.myway.backend.util.GeoUtils;
import com.myway.backend.util.GeoUtils.SegmentProjection;

import java.util.Arrays;
import java.util.Optional;

public final class SegmentGrid {

    public static final int MIN_NETWORK_NODES = 200;
    private static final double CELL_DEGREES = 0.002;
    private static final double METERS_PER_DEGREE = GeoUtils.EARTH_RADIUS_METERS * Math.PI / 180.0;

    private final RoadGraph graph;
    private final double minLatitude;
    private final double minLongitude;
    private final int rows;
    private final int columns;
    private final int[] firstEntry;
    private final int[] entries;

    public SegmentGrid(RoadGraph graph) {
        this(graph, MIN_NETWORK_NODES);
    }

    public SegmentGrid(RoadGraph graph, int minNetworkNodes) {
        this.graph = graph;
        boolean[] indexed = nodesInLargeNetworks(graph, minNetworkNodes);

        double minLat = Double.POSITIVE_INFINITY;
        double maxLat = Double.NEGATIVE_INFINITY;
        double minLon = Double.POSITIVE_INFINITY;
        double maxLon = Double.NEGATIVE_INFINITY;
        for (int node = 0; node < graph.nodeCount(); node++) {
            if (indexed[node]) {
                minLat = Math.min(minLat, graph.latitude(node));
                maxLat = Math.max(maxLat, graph.latitude(node));
                minLon = Math.min(minLon, graph.longitude(node));
                maxLon = Math.max(maxLon, graph.longitude(node));
            }
        }
        boolean empty = minLat > maxLat;
        this.minLatitude = empty ? 0 : minLat;
        this.minLongitude = empty ? 0 : minLon;
        this.rows = empty ? 0 : (int) ((maxLat - minLat) / CELL_DEGREES) + 1;
        this.columns = empty ? 0 : (int) ((maxLon - minLon) / CELL_DEGREES) + 1;

        int[] cellStarts = new int[rows * columns + 1];
        forEachSegmentCell(indexed, (cell, edge) -> cellStarts[cell + 1]++);
        for (int cell = 0; cell < rows * columns; cell++) {
            cellStarts[cell + 1] += cellStarts[cell];
        }
        int[] cellEntries = new int[cellStarts[rows * columns]];
        int[] nextEntry = Arrays.copyOf(cellStarts, rows * columns);
        forEachSegmentCell(indexed, (cell, edge) -> cellEntries[nextEntry[cell]++] = edge);
        this.firstEntry = cellStarts;
        this.entries = cellEntries;
    }

    public Optional<RoadSnap> nearest(double latitude, double longitude, double maxMeters) {
        if (rows == 0) {
            return Optional.empty();
        }
        double latitudeMargin = maxMeters / METERS_PER_DEGREE;
        double longitudeMargin = latitudeMargin / Math.max(Math.cos(Math.toRadians(latitude)), 0.01);
        int firstRow = row(latitude - latitudeMargin);
        int lastRow = row(latitude + latitudeMargin);
        int firstColumn = column(longitude - longitudeMargin);
        int lastColumn = column(longitude + longitudeMargin);

        RoadSnap best = null;
        for (int row = firstRow; row <= lastRow; row++) {
            for (int column = firstColumn; column <= lastColumn; column++) {
                int cell = row * columns + column;
                for (int entry = firstEntry[cell]; entry < firstEntry[cell + 1]; entry++) {
                    int edge = entries[entry];
                    int from = graph.edgeSource(edge);
                    int to = graph.edgeTarget(edge);
                    SegmentProjection projection = GeoUtils.projectOnSegment(latitude, longitude,
                            graph.latitude(from), graph.longitude(from), graph.latitude(to), graph.longitude(to));
                    if (projection.distanceMeters() <= maxMeters
                            && (best == null || projection.distanceMeters() < best.distanceMeters())) {
                        best = new RoadSnap(edge, from, to, projection.fraction(),
                                projection.latitude(), projection.longitude(), projection.distanceMeters());
                    }
                }
            }
        }
        return Optional.ofNullable(best);
    }

    private static boolean[] nodesInLargeNetworks(RoadGraph graph, int minNodes) {
        int nodeCount = graph.nodeCount();
        int[] network = new int[nodeCount];
        Arrays.fill(network, -1);
        int[] queue = new int[nodeCount];
        int[] networkSizes = new int[16];
        int networkCount = 0;

        for (int start = 0; start < nodeCount; start++) {
            if (network[start] != -1 || graph.firstEdge(start) == graph.endEdge(start)) {
                continue;
            }
            int head = 0;
            int tail = 0;
            queue[tail++] = start;
            network[start] = networkCount;
            while (head < tail) {
                int node = queue[head++];
                for (int edge = graph.firstEdge(node); edge < graph.endEdge(node); edge++) {
                    int next = graph.edgeTarget(edge);
                    if (network[next] == -1) {
                        network[next] = networkCount;
                        queue[tail++] = next;
                    }
                }
            }
            if (networkCount == networkSizes.length) {
                networkSizes = Arrays.copyOf(networkSizes, networkCount * 2);
            }
            networkSizes[networkCount++] = tail;
        }

        boolean[] indexed = new boolean[nodeCount];
        for (int node = 0; node < nodeCount; node++) {
            indexed[node] = network[node] >= 0 && networkSizes[network[node]] >= minNodes;
        }
        return indexed;
    }

    private void forEachSegmentCell(boolean[] indexed, CellConsumer consumer) {
        for (int from = 0; from < graph.nodeCount(); from++) {
            if (!indexed[from]) {
                continue;
            }
            for (int edge = graph.firstEdge(from); edge < graph.endEdge(from); edge++) {
                int to = graph.edgeTarget(edge);
                if (from > to) {
                    continue;
                }
                int firstRow = row(Math.min(graph.latitude(from), graph.latitude(to)));
                int lastRow = row(Math.max(graph.latitude(from), graph.latitude(to)));
                int firstColumn = column(Math.min(graph.longitude(from), graph.longitude(to)));
                int lastColumn = column(Math.max(graph.longitude(from), graph.longitude(to)));
                for (int row = firstRow; row <= lastRow; row++) {
                    for (int column = firstColumn; column <= lastColumn; column++) {
                        consumer.accept(row * columns + column, edge);
                    }
                }
            }
        }
    }

    private int row(double latitude) {
        return Math.clamp((long) Math.floor((latitude - minLatitude) / CELL_DEGREES), 0, rows - 1);
    }

    private int column(double longitude) {
        return Math.clamp((long) Math.floor((longitude - minLongitude) / CELL_DEGREES), 0, columns - 1);
    }

    private interface CellConsumer {
        void accept(int cell, int edge);
    }
}
