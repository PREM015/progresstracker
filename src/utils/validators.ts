// ============================================================================
// FILE: src/utils/validators.ts
// PURPOSE: Client-side validation utilities
// ============================================================================

// EMAIL VALIDATION:
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// PASSWORD VALIDATION:
export interface PasswordStrength {
    score: number; // 0-4
    label: 'weak' | 'fair' | 'good' | 'strong';
    feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score++;
    else feedback.push('Use at least 8 characters');

    if (password.length >= 12) score++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    else feedback.push('Use both uppercase and lowercase letters');

    if (/\d/.test(password)) score++;
    else feedback.push('Include at least one number');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    else feedback.push('Include at least one special character');

    const labels: Record<number, PasswordStrength['label']> = {
        0: 'weak',
        1: 'weak',
        2: 'fair',
        3: 'good',
        4: 'strong',
    };

    return {
        score: Math.min(score, 4),
        label: labels[Math.min(score, 4)],
        feedback,
    };
}

// USERNAME VALIDATION:
export function isValidUsername(username: string): { valid: boolean; error?: string } {
    if (username.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 30) {
        return { valid: false, error: 'Username must be less than 30 characters' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }
    if (/^[_-]|[_-]$/.test(username)) {
        return { valid: false, error: 'Username cannot start or end with underscore or hyphen' };
    }
    return { valid: true };
}

// URL VALIDATION:
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// PLATFORM USERNAME VALIDATION:
const platformUsernamePatterns: Record<string, RegExp> = {
    github: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
    leetcode: /^[a-zA-Z0-9_-]{1,15}$/,
    codeforces: /^[a-zA-Z0-9_]{3,24}$/,
    codechef: /^[a-zA-Z0-9_]{3,14}$/,
    hackerrank: /^[a-zA-Z0-9_-]{3,32}$/,
    // Add other platforms as needed
};

export function isValidPlatformUsername(platform: string, username: string): boolean {
    const pattern = platformUsernamePatterns[platform.toLowerCase()];
    if (!pattern) return username.length > 0; // Default: just non-empty
    return pattern.test(username);
}

// DATE VALIDATION:
export function isValidDate(date: string): boolean {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
}

export function isDateInPast(date: Date | string): boolean {
    return new Date(date) < new Date();
}

export function isDateInFuture(date: Date | string): boolean {
    return new Date(date) > new Date();
}

// FORM VALIDATION HELPERS:
export function validateRequired(value: unknown, fieldName = 'This field'): string | null {
    if (value === undefined || value === null || value === '') {
        return `${fieldName} is required`;
    }
    return null;
}

export function validateMinLength(value: string, min: number, fieldName = 'This field'): string | null {
    if (value.length < min) {
        return `${fieldName} must be at least ${min} characters`;
    }
    return null;
}

export function validateMaxLength(value: string, max: number, fieldName = 'This field'): string | null {
    if (value.length > max) {
        return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
}

// COMBINED VALIDATOR:
type ValidatorFn = (value: unknown) => string | null;

export function validate(value: unknown, validators: ValidatorFn[]): string | null {
    for (const validator of validators) {
        const error = validator(value);
        if (error) return error;
    }
    return null;
}

// ASYNC VALIDATION (for username/email availability):
export async function checkAvailability(
    type: 'email' | 'username',
    value: string
): Promise<boolean> {
    try {
        const response = await fetch(`/api/auth/check-${type}?value=${encodeURIComponent(value)}`);
        const data = await response.json();
        return data.available;
    } catch {
        return true; // Assume available on error
    }
}
