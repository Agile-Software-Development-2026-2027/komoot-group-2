package com.myway.backend.graph;

import com.myway.backend.util.GeoUtils;

import java.util.Arrays;

public final class TestRoadGraphs {

    private TestRoadGraphs() {
    }

    public static RoadGraph build(double[][] nodes, int[][] segments) {
        int nodeCount = nodes.length;
        float[] latitudes = new float[nodeCount];
        float[] longitudes = new float[nodeCount];
        for (int node = 0; node < nodeCount; node++) {
            latitudes[node] = (float) nodes[node][0];
            longitudes[node] = (float) nodes[node][1];
        }

        int[] firstEdge = new int[nodeCount + 1];
        for (int[] segment : segments) {
            firstEdge[segment[0] + 1]++;
            firstEdge[segment[1] + 1]++;
        }
        for (int node = 0; node < nodeCount; node++) {
            firstEdge[node + 1] += firstEdge[node];
        }

        int[] edgeTargets = new int[2 * segments.length];
        float[] edgeLengths = new float[edgeTargets.length];
        int[] nextEdge = Arrays.copyOf(firstEdge, nodeCount);
        for (int[] segment : segments) {
            int from = segment[0];
            int to = segment[1];
            float length = (float) GeoUtils.haversineMeters(latitudes[from], longitudes[from], latitudes[to], longitudes[to]);
            edgeTargets[nextEdge[from]] = to;
            edgeLengths[nextEdge[from]++] = length;
            edgeTargets[nextEdge[to]] = from;
            edgeLengths[nextEdge[to]++] = length;
        }
        return new RoadGraph(latitudes, longitudes, firstEdge, edgeTargets, edgeLengths);
    }
}
