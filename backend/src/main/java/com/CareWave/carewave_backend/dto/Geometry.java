package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class Geometry {
    private String type;
    private List<Double> coordinates;
}
