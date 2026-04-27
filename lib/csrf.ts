/**
 * CSRF Token Management
 * Handles retrieving and managing CSRF tokens from Django backend
 */

let cachedCsrfToken: string | null = null;

/**
 * Get CSRF token from Django REST Framework
 * This endpoint returns the CSRF token in a cookie that Django recognizes
 */
export async function fetchCsrfToken(): Promise<string | null> {
    // Return cached token if available
    if (cachedCsrfToken) {
        return cachedCsrfToken;
    }

    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/csrf/`,
            {
                method: 'GET',
                credentials: 'include',
            }
        );

        if (response.ok) {
            const data = await response.json();
            cachedCsrfToken = data.csrfToken;
            return cachedCsrfToken;
        }
    } catch (error) {
        console.warn('[CSRF] Failed to fetch token from endpoint:', error);
    }

    // Try to get from cookies as fallback
    return getCsrfTokenFromCookies();
}

/**
 * Get CSRF token from cookies (fallback method)
 */
export function getCsrfTokenFromCookies(): string | null {
    const name = 'csrftoken';

    if (typeof document === 'undefined') {
        return null;
    }

    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === name + '=') {
                const token = decodeURIComponent(cookie.substring(name.length + 1));
                cachedCsrfToken = token;
                return token;
            }
        }
    }

    return null;
}

/**
 * Clear cached CSRF token (useful after logout or error)
 */
export function clearCsrfToken(): void {
    cachedCsrfToken = null;
}
