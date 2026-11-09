package com.myway.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@SpringBootApplication
public class MyWayApplication {

	static {
		loadEnv();
	}

	public static void main(String[] args) {
		SpringApplication.run(MyWayApplication.class, args);
	}

	private static void loadEnv() {
		Path[] possiblePaths = { Paths.get(".env"), Paths.get("../.env") };
		for (Path path : possiblePaths) {
			if (Files.exists(path)) {
				try {
					Files.readAllLines(path).forEach(line -> {
						line = line.trim();
						if (!line.isEmpty() && !line.startsWith("#") && line.contains("=")) {
							int eqIdx = line.indexOf('=');
							String key = line.substring(0, eqIdx).trim();
							String value = line.substring(eqIdx + 1).trim();
							if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
								value = value.substring(1, value.length() - 1);
							} else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
								value = value.substring(1, value.length() - 1);
							}
							if (System.getProperty(key) == null && System.getenv(key) == null) {
								System.setProperty(key, value);
							}
						}
					});
					break;
				} catch (IOException ignored) {
				}
			}
		}
	}
}
