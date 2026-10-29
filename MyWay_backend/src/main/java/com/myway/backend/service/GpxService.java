package com.myway.backend.service;

import org.springframework.web.multipart.MultipartFile;
//interface for GPX service operations
public interface GpxService {
    void salvaGpxInMemoria(MultipartFile file);
}
