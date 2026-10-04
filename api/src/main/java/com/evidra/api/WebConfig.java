package com.evidra.api;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor auth;

    public WebConfig(AuthInterceptor auth) {
        this.auth = auth;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("*")
            .allowedMethods("GET", "POST", "PATCH", "OPTIONS")
            .allowedHeaders("Authorization", "Content-Type");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(auth)
            .addPathPatterns("/**")
            .excludePathPatterns("/auth/login", "/error", "/", "/index.html", "/App.js", "/Style.css", "/favicon.ico");
            }
}