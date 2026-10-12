package com.evidra.api;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** A failure meant for the user, answered as {"erro": mensagem} with the given HTTP status. */
public class ApiErro extends RuntimeException {

    final int status;

    public ApiErro(int status, String mensagem) {
        super(mensagem);
        this.status = status;
    }

    @RestControllerAdvice
    static class Handler {
        @ExceptionHandler(ApiErro.class)
        ResponseEntity<Map<String, String>> erro(ApiErro e) {
            return ResponseEntity.status(e.status).body(Map.of("erro", e.getMessage()));
        }

        // the multipart limit is enforced before any controller runs, so it can only be caught here
        @ExceptionHandler(MaxUploadSizeExceededException.class)
        ResponseEntity<Map<String, String>> grande() {
            return ResponseEntity.status(413).body(Map.of("erro", EvidenceController.MSG_GRANDE));
        }
    }
}
