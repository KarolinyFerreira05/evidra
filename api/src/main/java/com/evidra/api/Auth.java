package com.evidra.api;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

public final class Auth {

    private Auth() {}

    private static int get(String name) {
        return (Integer) RequestContextHolder.currentRequestAttributes()
            .getAttribute(name, RequestAttributes.SCOPE_REQUEST);
    }

    public static int orgId()  { return get("orgId"); }
    public static int userId() { return get("userId"); }
}