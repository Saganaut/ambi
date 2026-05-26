# Backend Rules (Java / Spring Boot)

Rules specific to the Spring Boot backend under `backend/`.

1.  **Java/Spring Boot Standards:** Adhere to standard Java and Spring Boot coding conventions and best practices.
2.  **Lombok:** Use Lombok for boilerplate reduction in DTOs and models.
3.  **Feature Architecture:** Strictly maintain the `controller/`, `service/`, `repository/`, `model/`, `dto/`, `config/` separation.
    - DTO class names follow [DTO-NAMING-RULES.md](DTO-NAMING-RULES.md): every class in `dto/` ends in one of `Request`, `Response`, `Page`, or `Message`, is a `record`, and lives in its own file.
4.  **API Documentation:** Document all REST endpoints using Springdoc OpenAPI so the `/swagger-ui/` specification stays current.
5.  **Testing:**
    - Write comprehensive unit/integration tests for new features and bug fixes.
    - Utilize Spring Boot test starters and `@MockitoBean` for mocking.
    - Run tests under the "test" profile with `TestSecurityConfig`.
    - Never change a test to make it pass without addressing the underlying issue. Always fix the code or the test to ensure correctness.
6.  **API Client Regeneration:** Regenerate the frontend API client after any backend API changes affecting the OpenAPI schema.
7.  **CI Must Pass Before Merging:** Every PR targeting `main` must have the GitHub Actions CI checks (`Frontend tests` and `Backend tests`) passing before it is merged.
