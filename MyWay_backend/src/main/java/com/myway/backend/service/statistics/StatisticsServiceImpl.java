package com.myway.backend.service.statistics;

import org.springframework.stereotype.Service;

import com.myway.backend.dto.GPXDataDTO.PointDTO;
import com.myway.backend.dto.GPXDataDTO.RouteDTO;

@Service 
public class StatisticsServiceImpl implements StatisticsService{

    @Override
    public double elevationGain(PointDTO start, PointDTO finish) {
        return finish.getElevation() - start.getElevation();
    }

    @Override
    public double trackLength(RouteDTO track) {

    }

    @Override
    public double straightLineTrackLenght(RouteDTO track) {

    }
    
}
