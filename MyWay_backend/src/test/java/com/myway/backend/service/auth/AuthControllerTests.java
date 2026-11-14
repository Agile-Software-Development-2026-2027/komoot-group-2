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
}
