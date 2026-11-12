package com.myway.backend.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "folders")
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    // Costruttore vuoto (obbligatorio per JPA)
    public Folder() {
    }

    // Costruttore con campi
    public Folder(String name, String userEmail) {
        this.name = name;
        this.userEmail = userEmail;
    }

    // Getter e Setter
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }
}