package com.evidra.api;

import java.util.Arrays;
import java.util.Map;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

public final class Auth {

    private Auth() {}

    public static final String ADMIN = "admin", RESPONSAVEL = "responsavel", AUDITOR = "auditor";

    static final Map<String, String> NOMES = Map.of(
        ADMIN, "Administrador", RESPONSAVEL, "Responsável por dados", AUDITOR, "Auditor");

    private static Object get(String name) {
        return RequestContextHolder.currentRequestAttributes().getAttribute(name, RequestAttributes.SCOPE_REQUEST);
    }

    public static int orgId()     { return (Integer) get("orgId"); }
    public static int userId()    { return (Integer) get("userId"); }
    public static String role()   { return (String) get("role"); }

    /** Stops the request with 403 unless the current user has one of these roles. Admin always passes. */
    public static void exigir(String... papeis) {
        String r = role();
        if (ADMIN.equals(r) || Arrays.asList(papeis).contains(r)) return;
        throw new ApiErro(403, "Seu perfil (" + NOMES.getOrDefault(r, r) + ") não tem permissão para esta ação.");
    }
}
