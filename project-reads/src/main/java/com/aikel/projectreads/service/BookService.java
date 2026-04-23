package com.aikel.projectreads.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.aikel.projectreads.entity.Book;
import com.aikel.projectreads.repository.BookRepository;

@Service
public class BookService {

    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    // Business Logic: Add a new book to the inventory
    public Book addBook(Book book) {
        return bookRepository.save(book);
    }

    // Business Logic: View all books
    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }
}