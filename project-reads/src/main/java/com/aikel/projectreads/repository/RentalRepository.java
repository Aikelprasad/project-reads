package com.aikel.projectreads.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aikel.projectreads.entity.Rental;

public interface RentalRepository extends JpaRepository<Rental, Long> {
}