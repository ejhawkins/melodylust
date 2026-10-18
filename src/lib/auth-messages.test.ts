import { describe, expect, it } from 'vitest';
import { authMessage } from './auth-messages';

const err = (message: string, code?: string) => Object.assign(new Error(message), code ? { code } : {});

describe('authMessage', () => {
  it('explains Supabase’s email limits in plain words', () => {
    expect(authMessage(err('email rate limit exceeded', 'over_email_send_rate_limit'))).toMatch(/^Too many emails have gone out in the last hour/);
    expect(authMessage(err('email rate limit exceeded'))).toMatch(/^Too many emails/);
    expect(authMessage(err('For security purposes, you can only request this after 47 seconds.', 'over_email_send_rate_limit'))).toBe('For your security, wait 47 seconds before asking for another email.');
  });

  it('names the usual sign-in problems', () => {
    expect(authMessage(err('Invalid login credentials', 'invalid_credentials'))).toBe("That email and password don't match.");
    expect(authMessage(err('Email not confirmed'))).toBe('Confirm your email first: the link is in your inbox.');
    expect(authMessage(err('User already registered'))).toBe('That email already has an account. Sign in instead.');
    expect(authMessage(err('Password should be at least 8 characters.', 'weak_password'))).toBe('Choose a longer password, at least 8 characters.');
    expect(authMessage(err('Auth session missing!'))).toBe('This reset link has expired. Ask for a new one.');
  });

  it('keeps anything unfamiliar, and never shows an empty message', () => {
    expect(authMessage(err('Signups not allowed for this instance'))).toBe('Signups not allowed for this instance');
    expect(authMessage(null)).toBe("Sign-in isn't available right now. Try again in a moment.");
    expect(authMessage({ message: 'Invalid login credentials' })).toBe("That email and password don't match.");
  });
});
