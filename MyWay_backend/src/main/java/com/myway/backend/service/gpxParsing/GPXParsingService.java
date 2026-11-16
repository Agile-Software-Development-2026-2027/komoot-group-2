package com.myway.backend.service.gpxParsing;

import java.nio.file.Path;
import org.springframework.web.multipart.MultipartFile;
import com.myway.backend.dto.gpx.GPXDataDTO;

public interface GPXParsingService {

    GPXDataDTO parseGPX(MultipartFile file);

    GPXDataDTO parseGPX(Path path);
}
