package com.myway.backend.dto.waypoint;

import com.myway.backend.model.enums.WaypointCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishWaypointRequestDTO {

    @NotEmpty
    private Set<WaypointCategory> categories;

    @Size(max = 5000)
    private String description;

    @NotNull @DecimalMin("-90") @DecimalMax("90")
    private Double latitude;

    @NotNull @DecimalMin("-180") @DecimalMax("180")
    private Double longitude;

    /** Images as base64 data URLs (data:image/png;base64,...). */
    @Size(max = 10)
    private List<String> photos;
}
