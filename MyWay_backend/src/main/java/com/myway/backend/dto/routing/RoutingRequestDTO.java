package com.myway.backend.dto.routing;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoutingRequestDTO {

    @NotNull @DecimalMin("-90") @DecimalMax("90")
    private Double fromLat;

    @NotNull @DecimalMin("-180") @DecimalMax("180")
    private Double fromLon;

    @NotNull @DecimalMin("-90") @DecimalMax("90")
    private Double toLat;

    @NotNull @DecimalMin("-180") @DecimalMax("180")
    private Double toLon;
}
