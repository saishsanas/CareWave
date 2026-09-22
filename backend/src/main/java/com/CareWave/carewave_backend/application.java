package com.CareWave.carewave_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class application {

	public static void main(String[] args) {
		SpringApplication.run(application.class, args);
	}

}
