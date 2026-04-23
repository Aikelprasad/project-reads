package com.aikel.projectreads.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "books")
public class Book {
    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String title;
    private String author;
    private String filePath;
    private int availableCopies;
    
    // NEW: Stores the uploaded image filename
    private String coverImage;
    
    @Column(columnDefinition = "TEXT")
    private String reviews = "";

    @Column(columnDefinition = "TEXT")
    private String activeRentals = "";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    
    public int getAvailableCopies() { return availableCopies; }
    public void setAvailableCopies(int availableCopies) { this.availableCopies = availableCopies; }
    
    public String getReviews() { return reviews; }
    public void setReviews(String reviews) { this.reviews = reviews; }

    public String getActiveRentals() { return activeRentals == null ? "" : activeRentals; }
    public void setActiveRentals(String activeRentals) { this.activeRentals = activeRentals; }
}