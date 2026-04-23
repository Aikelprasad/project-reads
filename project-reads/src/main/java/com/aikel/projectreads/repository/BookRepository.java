package com.aikel.projectreads.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aikel.projectreads.entity.Book;

public interface BookRepository extends JpaRepository<Book, Long> {
}