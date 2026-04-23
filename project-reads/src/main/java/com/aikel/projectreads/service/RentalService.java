/*package com.aikel.projectreads.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.aikel.projectreads.entity.Book;
import com.aikel.projectreads.entity.Rental;
import com.aikel.projectreads.repository.BookRepository;
import com.aikel.projectreads.repository.RentalRepository;

@Service
public class RentalService {

    private final RentalRepository rentalRepository;
    private final BookRepository bookRepository;

    public RentalService(RentalRepository rentalRepository, BookRepository bookRepository) {
        this.rentalRepository = rentalRepository;
        this.bookRepository = bookRepository;
    }

    // Business Logic: Checkout a Book
    public Rental rentBook(Long userId, Long bookId) {
        // 1. Find the book
        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new RuntimeException("Book not found in database"));

        // 2. Check inventory
        if (book.getAvailableCopies() <= 0) {
            throw new RuntimeException("No copies available right now");
        }

        // 3. Decrease available copies and save the updated book
        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);

        // 4. Create the rental ledger entry
        Rental rental = new Rental();
        rental.setUserId(userId);
        rental.setBookId(bookId);
        rental.setRentalDate(LocalDate.now());
        rental.setDueDate(LocalDate.now().plusDays(14)); // Standard 2-week checkout
        rental.setStatus("ACTIVE");

        return rentalRepository.save(rental);
    }

    // Business Logic: Return a Book
    public Rental returnBook(Long rentalId) {
        // 1. Find the rental record
        Rental rental = rentalRepository.findById(rentalId)
                .orElseThrow(() -> new RuntimeException("Rental record not found"));

        if (rental.getStatus().equals("RETURNED")) {
            throw new RuntimeException("This book was already returned");
        }

        // 2. Find the book and increase available copies
        Book book = bookRepository.findById(rental.getBookId())
                .orElseThrow(() -> new RuntimeException("Book not found in database"));
        book.setAvailableCopies(book.getAvailableCopies() + 1);
        bookRepository.save(book);

        // 3. Mark rental as returned
        rental.setStatus("RETURNED");
        return rentalRepository.save(rental);
    }

    public List<Rental> getAllRentals() {
        return rentalRepository.findAll();
    }
}*/