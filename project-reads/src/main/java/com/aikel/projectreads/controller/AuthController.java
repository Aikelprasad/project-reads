package com.aikel.projectreads.controller;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aikel.projectreads.entity.Member;
import com.aikel.projectreads.repository.MemberRepository;

import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final MemberRepository memberRepository;

    public AuthController(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    // This creates your master Admin account automatically if it doesn't exist
    @PostConstruct
    public void init() {
        if (memberRepository.findByUsername("admin").isEmpty()) {
            Member admin = new Member();
            admin.setUsername("admin");
            admin.setPassword("admin123"); // Default password
            admin.setRole("admin");
            memberRepository.save(admin);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Member member) {
        if (memberRepository.findByUsername(member.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Username already taken\"}");
        }
        member.setRole("user");
        return ResponseEntity.ok(memberRepository.save(member));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Member credentials) {
        Member member = memberRepository.findByUsername(credentials.getUsername()).orElse(null);
        if (member != null && member.getPassword().equals(credentials.getPassword())) {
            // Track the login time
            member.setLastLogin(LocalDateTime.now());
            memberRepository.save(member);
            return ResponseEntity.ok(member);
        }
        return ResponseEntity.status(401).body("{\"error\": \"Invalid credentials\"}");
    }

    @GetMapping("/logs")
    public List<Member> getLogs() {
        return memberRepository.findAll();
    }
}