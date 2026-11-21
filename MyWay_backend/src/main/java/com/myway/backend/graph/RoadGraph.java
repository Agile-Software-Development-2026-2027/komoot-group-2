package com.myway.backend.graph;

import java.io.EOFException;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.FileChannel;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public final class RoadGraph {

    private static final int FILE_FORMAT = 0x4D574731;
    private static final int BUFFER_BYTES = 1 << 22;
    private static final int VALUES_PER_BUFFER = BUFFER_BYTES / Integer.BYTES;

    private final float[] latitudes;
    private final float[] longitudes;
    private final int[] firstEdge;
    private final int[] edgeTargets;
    private final float[] edgeLengths;

    RoadGraph(float[] latitudes, float[] longitudes, int[] firstEdge, int[] edgeTargets, float[] edgeLengths) {
        this.latitudes = latitudes;
        this.longitudes = longitudes;
        this.firstEdge = firstEdge;
        this.edgeTargets = edgeTargets;
        this.edgeLengths = edgeLengths;
    }

    public int nodeCount() {
        return latitudes.length;
    }

    public int edgeCount() {
        return edgeTargets.length;
    }

    public double latitude(int node) {
        return latitudes[node];
    }

    public double longitude(int node) {
        return longitudes[node];
    }

    public int firstEdge(int node) {
        return firstEdge[node];
    }

    public int endEdge(int node) {
        return firstEdge[node + 1];
    }

    public int edgeTarget(int edge) {
        return edgeTargets[edge];
    }

    public int edgeSource(int edge) {
        int low = 0;
        int high = nodeCount() - 1;
        while (low < high) {
            int middle = (low + high + 1) >>> 1;
            if (firstEdge[middle] <= edge) {
                low = middle;
            } else {
                high = middle - 1;
            }
        }
        return low;
    }

    public double edgeLength(int edge) {
        return edgeLengths[edge];
    }

    public void writeTo(Path file) throws IOException {
        try (FileChannel channel = FileChannel.open(file, StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE)) {
            ByteBuffer buffer = newBuffer();
            buffer.putInt(FILE_FORMAT).putInt(nodeCount()).putInt(edgeCount()).flip();
            writeFully(channel, buffer);
            write(channel, buffer, latitudes.length, (b, from, count) -> b.asFloatBuffer().put(latitudes, from, count));
            write(channel, buffer, longitudes.length, (b, from, count) -> b.asFloatBuffer().put(longitudes, from, count));
            write(channel, buffer, firstEdge.length, (b, from, count) -> b.asIntBuffer().put(firstEdge, from, count));
            write(channel, buffer, edgeTargets.length, (b, from, count) -> b.asIntBuffer().put(edgeTargets, from, count));
            write(channel, buffer, edgeLengths.length, (b, from, count) -> b.asFloatBuffer().put(edgeLengths, from, count));
        }
    }

    public static RoadGraph readFrom(Path file) throws IOException {
        try (FileChannel channel = FileChannel.open(file, StandardOpenOption.READ)) {
            ByteBuffer buffer = newBuffer();
            buffer.limit(3 * Integer.BYTES);
            readFully(channel, buffer);
            buffer.flip();
            if (buffer.getInt() != FILE_FORMAT) {
                throw new IOException("Not a road graph file: " + file);
            }
            int nodeCount = buffer.getInt();
            int edgeCount = buffer.getInt();

            float[] latitudes = new float[nodeCount];
            float[] longitudes = new float[nodeCount];
            int[] firstEdge = new int[nodeCount + 1];
            int[] edgeTargets = new int[edgeCount];
            float[] edgeLengths = new float[edgeCount];
            read(channel, buffer, latitudes.length, (b, from, count) -> b.asFloatBuffer().get(latitudes, from, count));
            read(channel, buffer, longitudes.length, (b, from, count) -> b.asFloatBuffer().get(longitudes, from, count));
            read(channel, buffer, firstEdge.length, (b, from, count) -> b.asIntBuffer().get(firstEdge, from, count));
            read(channel, buffer, edgeTargets.length, (b, from, count) -> b.asIntBuffer().get(edgeTargets, from, count));
            read(channel, buffer, edgeLengths.length, (b, from, count) -> b.asFloatBuffer().get(edgeLengths, from, count));
            return new RoadGraph(latitudes, longitudes, firstEdge, edgeTargets, edgeLengths);
        }
    }

    private static ByteBuffer newBuffer() {
        return ByteBuffer.allocateDirect(BUFFER_BYTES).order(ByteOrder.LITTLE_ENDIAN);
    }

    private static void write(FileChannel channel, ByteBuffer buffer, int length, ChunkCopier copier)
            throws IOException {
        for (int from = 0; from < length; from += VALUES_PER_BUFFER) {
            int count = Math.min(VALUES_PER_BUFFER, length - from);
            buffer.clear();
            copier.copy(buffer, from, count);
            buffer.limit(count * Integer.BYTES);
            writeFully(channel, buffer);
        }
    }

    private static void read(FileChannel channel, ByteBuffer buffer, int length, ChunkCopier copier)
            throws IOException {
        for (int from = 0; from < length; from += VALUES_PER_BUFFER) {
            int count = Math.min(VALUES_PER_BUFFER, length - from);
            buffer.clear().limit(count * Integer.BYTES);
            readFully(channel, buffer);
            buffer.flip();
            copier.copy(buffer, from, count);
        }
    }

    private static void writeFully(FileChannel channel, ByteBuffer buffer) throws IOException {
        while (buffer.hasRemaining()) {
            channel.write(buffer);
        }
    }

    private static void readFully(FileChannel channel, ByteBuffer buffer) throws IOException {
        while (buffer.hasRemaining()) {
            if (channel.read(buffer) < 0) {
                throw new EOFException("The road graph file is truncated");
            }
        }
    }

    private interface ChunkCopier {
        void copy(ByteBuffer buffer, int from, int count);
    }
}
