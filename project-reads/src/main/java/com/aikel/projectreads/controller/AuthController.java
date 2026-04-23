package com.aikel.projectreads.controller;

import com.aikel.projectreads.entity.Member;
import com.aikel.projectreads.repository.MemberRepository;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class AuthController {

    private final MemberRepository memberRepository;

    public AuthController(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if ("aikel".equals(username) && "aikel123".equals(password)) {
            return Map.of("role", "ADMIN", "username", "aikel");
        }

        Member member = memberRepository.findByUsername(username).orElse(null);
        if (member != null && member.getPassword().equals(password)) {
            return Map.of("role", "MEMBER", "username", username);
        }

        throw new RuntimeException("Invalid Credentials");
    }
}