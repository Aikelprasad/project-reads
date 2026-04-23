package com.aikel.projectreads;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PingController {

    @GetMapping("/ping")
    public String pingTest() {
        return "Server is live, Captain. Project Reads is breathing.";
    }
}