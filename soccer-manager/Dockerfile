# Etapa 1: compilar el proyecto con Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

# Etapa 2: correr el .jar con solo Java
FROM eclipse-temurin:17-jre
WORKDIR /app
# Hora de Colombia para que las fechas de actividades y asistencia coincidan con las del usuario
ENV TZ=America/Bogota
COPY --from=build /app/target/soccermanager.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]