# MyWay Tech Stack

**Komoot-group-2**  
October 2026

---

## 1 Introduction & Architecture

**MyWay** is a web application inspired by *Komoot* (app used for navigation and route planning, designed mainly for hikers and trail runners), designed for interactive map exploration, route planning, and GPX track management. The project is organized as a client-server comprising **Angular 21** (frontend) and **Spring Boot 4.1.1** on **Java 25** (backend).

## 2 Backend

* **Java 25, Spring Boot:** a robust framework to expose REST APIs, handling HTTP routing, request validation, and error management out of the box.
* **Postgres Database:** the standard open-source relational database, chosen for its seamless compatibility with Spring Data JPA and straightforward setup via Docker.

## 3 Frontend

* **Typescript 5, Angular:** provides a "batteries-included" setup with built-in routing, form validation, and HTTP client, while TypeScript prevents runtime errors by strictly typing data received from the backend.

## 4 Other

* **Docker:** packages the database and frontend into containers, ensuring that the application runs identically on every team member's computer without environment mismatches.
* **Flyway:** keeps the database structure synchronized across the entire team and CI pipeline, eliminating manual SQL execution when entities change.