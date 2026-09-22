# Multi-stage Dockerfile for CareWave Backend (Java 21)

# Stage 1: Maven Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Maven wrapper and POM first for efficient layer caching
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw

# Download dependencies offline
RUN ./mvnw dependency:go-offline -B || true

# Copy source and package application
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Stage 2: Runtime Container
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy built JAR artifact from builder
COPY --from=builder /app/target/*.jar app.jar

# Render dynamic PORT support (defaults to 8080)
EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["java", "-jar", "app.jar"]
