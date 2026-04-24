package com.aikel.projectreads.controller;

import com.aikel.projectreads.entity.Member;
import com.aikel.projectreads.repository.MemberRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final MemberRepository memberRepository;

    public AuthController(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    // Initialize Admin Account if it doesn't exist
    @PostConstruct
    public void initAdmin() {
        if (memberRepository.findByUsername("admin").isEmpty()) {
            Member admin = new Member();
            admin.setUsername("admin");
            admin.setPassword("admin123");
            memberRepository.save(admin);
        }
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        // Use the Optional fix here
        Member member = memberRepository.findByUsername(username).orElse(null);
        
        if (member != null && member.getPassword().equals(password)) {
            // Check if it's the admin account
            if ("admin".equals(username) || "aikel".equals(username)) {
                return Map.of("role", "ADMIN", "username", username);
            }
            return Map.of("role", "MEMBER", "username", username);
        }

        throw new RuntimeException("Invalid Credentials");
    }

    @PostMapping("/register")
    public Member register(@RequestBody Member member) {
        if (memberRepository.findByUsername(member.getUsername()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }
        return memberRepository.save(member);
    }
}