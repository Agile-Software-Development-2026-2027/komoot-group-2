package com.myway.backend.service.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

    @Autowired MockMvc mvc;

    private static String body(String email, String password, String username) {
        return "{\"email\":\"%s\",\"password\":\"%s\",\"username\":\"%s\"}".formatted(email, password, username);
    }

    @Test
    void registerLoginAndGetUser() throws Exception {
        String res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body("Mario@Test.it", "password123", "mario")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("mario@test.it"))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        // duplicate
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body("mario@test.it", "password123", "other")))
                .andExpect(status().isConflict());

        // wrong password / unknown email
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mario@test.it\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@test.it\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());

        String login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"MARIO@test.it\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode json = new ObjectMapper().readTree(login);
        String token = json.get("token").asText();

        mvc.perform(get("/api/auth/get_user").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("mario@test.it"))
                .andExpect(jsonPath("$.username").value("mario"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void getUserWithoutTokenIsRejected() throws Exception {
        mvc.perform(get("/api/auth/get_user")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/get_user").header("Authorization", "Bearer garbage"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidRegisterIsBadRequest() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body("not-an-email", "short", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    private void register(String email, String password, int expectedStatus) throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body(email, password, "user")))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    void invalidEmailsAreRejected() throws Exception {
        for (String email : new String[] {"plainaddress", "@no-local.it", "no-at.it", "a@", "", "   "}) {
            register(email, "password123", 400);
        }
    }

    @Test
    void passwordLengthBoundaries() throws Exception {
        register("len7@test.it", "a".repeat(7), 400);
        register("len8@test.it", "a".repeat(8), 201);
        register("len72@test.it", "a".repeat(72), 201);
        register("len73@test.it", "a".repeat(73), 400);
        register("blankpw@test.it", "", 400);
    }

    @Test
    void emailIsCaseInsensitiveAndWhitespaceIsRejected() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(body("Trim@Test.IT", "password123", "trim")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("trim@test.it"));
        register("TRIM@test.it", "password123", 409);
        // the frontend trims before sending; the backend validation refuses padded emails
        register(" padded@test.it ", "password123", 400);
    }

    @Test
    void loginWithBlankFieldsIsBadRequest() throws Exception {
        for (String json : new String[] {
                "{\"email\":\"\",\"password\":\"password123\"}",
                "{\"email\":\"a@test.it\",\"password\":\"\"}",
                "{}"}) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void passwordIsCaseSensitive() throws Exception {
        register("case@test.it", "Password123", 201);
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"case@test.it\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
    }
}
