# MyWay Tech Report: Map Providers & GPX Libraries

## GPX Libraries
* **JPX**: (*Java*, already in use) <https://github.com/jenetics/jpx> - Primarily utilized for backend GPX parsing and validation. Key advantages include strict immutability, thread safety, and built-in spatial computations.
* **Leaflet**: (*JavaScript/TypeScript*, already in use) <https://leafletjs.com> - Mostly applied to render interactive 2D maps. Major benefits involve a tiny bundle size and excellent cross-platform DOM performance.
* **MapLibre GL JS / Mapbox GL JS**: (*JavaScript/TypeScript*) <https://maplibre.org> / <https://docs.mapbox.com/mapbox-gl-js> - Chiefly deployed for high-performance WebGL client-side rendering. Notable perks are hardware acceleration, fluid 3D terrain elevation, and the ability to handle massive datasets effortlessly.
* **OpenLayers**: (*JavaScript*) <https://openlayers.org> - Typically chosen for complex enterprise GIS web applications. Standout features encompass native GPX parsing without external plugins and robust spatial projection support.
* **@mapbox/togeojson**: (*JavaScript/Node.js*) <https://github.com/mapbox/togeojson> - Principally serves to convert GPX and KML datasets into GeoJSON format. Its primary strengths lie in rapid execution and seamless integration with modern WebGL pipelines.

## Map Providers
* **OpenStreetMap (OSM)**: (*Raster Map Tiles*, already in use) <https://www.openstreetmap.org> - Predominantly relied upon for global topographic and road network displays. The greatest benefits are its completely free, community-driven nature, and suitability for open-source outdoor apps.
* **Mapbox / MapLibre**: (*Vector Tiles*) <https://www.mapbox.com> - Generally employed for advanced custom map visualizations. Top advantages consist of high-performance rendering, dynamic styling capabilities, and native 3D terrain support.
* **Thunderforest / MapTiler**: (*Specialized Map Tiles*) <https://www.thunderforest.com> / <https://www.maptiler.com> - Mostly targeted at dedicated hiking and trail applications. Winning traits include high-resolution outdoor layers and highly detailed topographic datasets.