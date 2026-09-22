package com.CareWave.carewave_backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LiveLocationResponse {

    private Double latitude;
    private Double longitude;
}



//package com.CareWave.carewave_backend.dto;
//
//import lombok.Getter;
//import lombok.Setter;
//import java.time.LocalDateTime;
//
//@Getter
//@Setter
//public class LiveLocationResponse {
//    private Double latitude;
//    private Double longitude;
//    private LocalDateTime lastLocationUpdatedAt;
//    private Boolean gpsEnabled;
//}
