package com.aikel.projectreads.controller;

import com.aikel.projectreads.entity.Book;
import com.aikel.projectreads.repository.BookRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class LibraryController {

    private final BookRepository bookRepository;
    private final Path root = Paths.get("uploads");

    public LibraryController(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
        try { 
            Files.createDirectories(root); 
        } catch (IOException e) { 
            throw new RuntimeException("Could not initialize upload folder!", e); 
        }
    }

    @GetMapping("/books")
    public List<Book> getBooks() { 
        return bookRepository.findAll(); 
    }

    @PostMapping("/admin/add")
    public Book addBook(@RequestParam("file") MultipartFile file, 
                        @RequestParam("cover") MultipartFile cover,
                        @RequestParam("title") String title, 
                        @RequestParam("author") String author, 
                        @RequestParam("copies") int copies) throws Exception {
        
        String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Files.copy(file.getInputStream(), this.root.resolve(filename));

        String coverFilename = System.currentTimeMillis() + "_cover_" + cover.getOriginalFilename();
        Files.copy(cover.getInputStream(), this.root.resolve(coverFilename));
        
        Book book = new Book();
        book.setTitle(title); 
        book.setAuthor(author); 
        book.setAvailableCopies(copies);
        book.setFilePath(filename); 
        book.setCoverImage(coverFilename);
        book.setReviews(""); 
        book.setActiveRentals("");
        return bookRepository.save(book);
    }

    @PostMapping("/books/{id}/update")
    public Book updateBook(@PathVariable Long id, 
                           @RequestParam("title") String title, 
                           @RequestParam("author") String author, 
                           @RequestParam("copies") int copies,
                           @RequestParam(value = "cover", required = false) MultipartFile cover) throws Exception {
        
        Book book = bookRepository.findById(id).orElseThrow();
        book.setTitle(title); 
        book.setAuthor(author); 
        book.setAvailableCopies(copies);
        
        if (cover != null && !cover.isEmpty()) {
            String coverFilename = System.currentTimeMillis() + "_cover_" + cover.getOriginalFilename();
            Files.copy(cover.getInputStream(), this.root.resolve(coverFilename));
            book.setCoverImage(coverFilename);
        }
        
        return bookRepository.save(book);
    }

    @PostMapping("/books/{id}/rent")
    public Book rentBook(@PathVariable Long id, @RequestParam("username") String username) {
        Book book = bookRepository.findById(id).orElseThrow();
        String rentals = book.getActiveRentals();
        
        if (book.getAvailableCopies() > 0 && !rentals.contains(username + ":")) {
            book.setAvailableCopies(book.getAvailableCopies() - 1);
            long rentTime = System.currentTimeMillis(); 
            book.setActiveRentals(rentals + username + ":" + rentTime + "|||");
            return bookRepository.save(book);
        }
        throw new RuntimeException("Cannot rent");
    }

    @PostMapping("/books/{id}/revoke")
    public Book revokeAccess(@PathVariable Long id, @RequestParam("username") String username) {
        Book book = bookRepository.findById(id).orElseThrow();
        String[] rentalArray = book.getActiveRentals().split("\\|\\|\\|");
        StringBuilder newRentals = new StringBuilder();
        boolean revoked = false;
        
        for (String r : rentalArray) {
            if (!r.trim().isEmpty()) {
                if (r.startsWith(username + ":")) {
                    revoked = true;
                } else {
                    newRentals.append(r).append("|||");
                }
            }
        }
        
        if (revoked) {
            book.setActiveRentals(newRentals.toString());
            book.setAvailableCopies(book.getAvailableCopies() + 1);
            return bookRepository.save(book);
        }
        return book;
    }

    @PostMapping("/books/{id}/review")
    public Book addReview(@PathVariable Long id, @RequestBody String review) {
        Book book = bookRepository.findById(id).orElseThrow();
        String current = book.getReviews();
        book.setReviews((current == null ? "" : current) + review + "|||");
        return bookRepository.save(book);
    }

    @GetMapping("/view/{filename}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) throws Exception {
        Path file = root.resolve(filename); 
        Resource resource = new UrlResource(file.toUri());
        
        String contentType = "application/octet-stream";
        String lowerName = filename.toLowerCase();
        
        if (lowerName.endsWith(".pdf")) {
            contentType = "application/pdf";
        } else if (lowerName.endsWith(".epub")) {
            contentType = "application/epub+zip";
        } else if (lowerName.matches(".*\\.(png|jpg|jpeg|webp|gif)$")) {
            String ext = lowerName.substring(lowerName.lastIndexOf('.') + 1);
            contentType = "image/" + (ext.equals("jpg") ? "jpeg" : ext);
        }
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}