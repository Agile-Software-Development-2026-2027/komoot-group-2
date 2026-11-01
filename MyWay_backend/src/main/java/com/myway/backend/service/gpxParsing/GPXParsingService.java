package com.myway.backend.service.gpxParsing;

import org.springframework.web.multipart.MultipartFile;
import com.myway.backend.dto.*;

public interface GPXParsingService {

    GPXDataDTO parseGPX(MultipartFile file);
}