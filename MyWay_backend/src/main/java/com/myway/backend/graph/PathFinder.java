package com.myway.backend.graph;

import com.myway.backend.util.GeoUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.PriorityQueue;

public final class PathFinder {

    private static final int START = -1;
    private static final int DESTINATION = -2;

    private final RoadGraph graph;
    private final RoadSnap destination;
    private final Map<Integer, Visit> visits = new HashMap<>();
    private final PriorityQueue<QueueEntry> queue = new PriorityQueue<>();
    private double bestDistance = Double.POSITIVE_INFINITY;
    private int bestLastNode = START;

    private PathFinder(RoadGraph graph, RoadSnap destination) {
        this.graph = graph;
        this.destination = destination;
    }

    public static Optional<RoadPath> find(RoadGraph graph, RoadSnap start, RoadSnap destination) {
        return new PathFinder(graph, destination).search(start);
    }

    private Optional<RoadPath> search(RoadSnap start) {
        double startLength = graph.edgeLength(start.edge());
        reach(start.from(), start.fraction() * startLength, START);
        reach(start.to(), (1 - start.fraction()) * startLength, START);
        if (start.from() == destination.from() && start.to() == destination.to()) {
            reachDestination(Math.abs(start.fraction() - destination.fraction()) * startLength, START);
        }

        double destinationLength = graph.edgeLength(destination.edge());
        while (!queue.isEmpty()) {
            QueueEntry entry = queue.poll();
            if (entry.node() == DESTINATION) {
                return Optional.of(new RoadPath(nodesTo(bestLastNode), bestDistance));
            }
            Visit visit = visits.get(entry.node());
            if (visit.settled || entry.distance() > visit.distance) {
                continue;
            }
            visit.settled = true;

            if (entry.node() == destination.from()) {
                reachDestination(entry.distance() + destination.fraction() * destinationLength, entry.node());
            }
            if (entry.node() == destination.to()) {
                reachDestination(entry.distance() + (1 - destination.fraction()) * destinationLength, entry.node());
            }
            for (int edge = graph.firstEdge(entry.node()); edge < graph.endEdge(entry.node()); edge++) {
                reach(graph.edgeTarget(edge), entry.distance() + graph.edgeLength(edge), entry.node());
            }
        }
        return Optional.empty();
    }

    private void reach(int node, double distance, int previous) {
        Visit visit = visits.get(node);
        if (visit == null) {
            visits.put(node, new Visit(distance, previous));
        } else if (!visit.settled && distance < visit.distance) {
            visit.distance = distance;
            visit.previous = previous;
        } else {
            return;
        }
        queue.add(new QueueEntry(node, distance, distance + distanceToDestination(node)));
    }

    private void reachDestination(double distance, int lastNode) {
        if (distance < bestDistance) {
            bestDistance = distance;
            bestLastNode = lastNode;
            queue.add(new QueueEntry(DESTINATION, distance, distance));
        }
    }

    private double distanceToDestination(int node) {
        return GeoUtils.haversineMeters(graph.latitude(node), graph.longitude(node),
                destination.latitude(), destination.longitude());
    }

    private int[] nodesTo(int lastNode) {
        List<Integer> nodes = new ArrayList<>();
        for (int node = lastNode; node != START; node = visits.get(node).previous) {
            nodes.add(node);
        }
        return nodes.reversed().stream().mapToInt(Integer::intValue).toArray();
    }

    private static final class Visit {
        private double distance;
        private int previous;
        private boolean settled;

        private Visit(double distance, int previous) {
            this.distance = distance;
            this.previous = previous;
        }
    }

    private record QueueEntry(int node, double distance, double estimate) implements Comparable<QueueEntry> {
        @Override
        public int compareTo(QueueEntry other) {
            return Double.compare(estimate, other.estimate);
        }
    }
}
