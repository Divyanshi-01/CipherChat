FROM maven:3.9.9-eclipse-temurin-11 AS build
WORKDIR /app

COPY pom.xml ./pom.xml
COPY .mvn ./.mvn
COPY common ./common
COPY backend ./backend
COPY frontend ./frontend

RUN mvn -pl frontend -am clean package -DskipTests

FROM eclipse-temurin:11-jre
WORKDIR /app

COPY --from=build /app/frontend/target/frontend-1.0.0.jar app.jar

EXPOSE 10000

CMD ["sh", "-c", "java -Dserver.port=${PORT:-10000} -jar app.jar"]
