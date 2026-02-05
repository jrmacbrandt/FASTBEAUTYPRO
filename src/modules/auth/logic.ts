export function validateDataIsolation(tenantA: string, tenantB: string) {
    return tenantA === tenantB;
}

export function canAccessRoute(role: string, route: string) {
    if (role === 'barber' && route.startsWith('/admin')) {
        return false;
    }
    return true;
}
