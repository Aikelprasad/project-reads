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
public class LibraryController {

    private final BookRepository bookRepository;
    private final Path root = Paths.get("uploads");

    public LibraryController(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
        try { 
            if (!Files.exists(root)) {
                Files.createDirectories(root);
            }
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
        book.setActiveRentals("");
        return bookRepository.save(book);
    }

    @PostMapping("/rent/{bookId}/{username}")
    public Book rentBook(@PathVariable Long bookId, @PathVariable String username) {
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));
        if (book.getAvailableCopies() > 0) {
            book.setAvailableCopies(book.getAvailableCopies() - 1);
            // Append username to rentals tracking
            book.setActiveRentals(book.getActiveRentals() + username + ",");
            return bookRepository.save(book);
        }
        throw new RuntimeException("No copies available");
    }

    @PostMapping("/return/{bookId}/{username}")
    public Book returnBook(@PathVariable Long bookId, @PathVariable String username) {
        Book book = bookRepository.findById(bookId).orElseThrow(() -> new RuntimeException("Book not found"));
        book.setAvailableCopies(book.getAvailableCopies() + 1);
        book.setActiveRentals(book.getActiveRentals().replace(username + ",", ""));
        return bookRepository.save(book);
    }

    @PostMapping("/admin/revoke/{bookId}/{username}")
    public Book revokeRental(@PathVariable Long bookId, @PathVariable String username) {
        return returnBook(bookId, username);
    }

    @GetMapping("/view/{filename}")
    public ResponseEntity<Resource> getFile(@PathVariable String filename) throws Exception {
        Path file = root.resolve(filename); 
        Resource resource = new UrlResource(file.toUri());
        
        String contentType = "application/octet-stream";
        if (filename.toLowerCase().endsWith(".pdf")) contentType = "application/pdf";
        else if (filename.toLowerCase().endsWith(".epub")) contentType = "application/epub+zip";
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }
}