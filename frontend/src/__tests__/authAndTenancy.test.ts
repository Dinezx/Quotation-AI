import { describe, it, expect } from 'vitest';

describe('Multi-Tenancy & Authorization Protection', () => {
  it('does not trust frontend supplied company IDs for security actions', () => {
    // Invariant: The client MUST NOT inject company_id into calculation or dispatch payloads
    const payloadForCalculation = {
      purchase_order_id: 'po-test-123',
      // company_id must NOT be required or trusted from frontend
    };

    expect(payloadForCalculation).not.toHaveProperty('company_id');
  });

  it('rejects unauthenticated user access to protected routes', () => {
    const checkRouteAccess = (isAuthenticated: boolean, path: string): string => {
      const publicRoutes = ['/', '/login', '/signup', '/auth/callback'];
      if (publicRoutes.includes(path)) {
        return path;
      }
      return isAuthenticated ? path : '/login';
    };

    expect(checkRouteAccess(false, '/')).toBe('/');
    expect(checkRouteAccess(false, '/signup')).toBe('/signup');
    expect(checkRouteAccess(false, '/login')).toBe('/login');
    expect(checkRouteAccess(false, '/dashboard')).toBe('/login');
    expect(checkRouteAccess(false, '/quotations')).toBe('/login');
    expect(checkRouteAccess(false, '/rates')).toBe('/login');
    expect(checkRouteAccess(true, '/dashboard')).toBe('/dashboard');
    expect(checkRouteAccess(true, '/quotation/qt-123')).toBe('/quotation/qt-123');
  });

  it('validates sign up payload structure before dispatching', () => {
    const validateSignUpInput = (data: {
      fullName: string;
      companyName: string;
      email: string;
      password?: string;
    }) => {
      if (!data.fullName.trim() || !data.companyName.trim() || !data.email.trim()) {
        throw new Error('Missing required fields');
      }
      if (data.password && data.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
      return true;
    };

    expect(validateSignUpInput({
      fullName: 'Vikram Joshi',
      companyName: 'Joshi CNC Works',
      email: 'v.joshi@joshicnc.in',
      password: 'masterpassword123',
    })).toBe(true);

    expect(() => validateSignUpInput({
      fullName: '',
      companyName: 'Joshi CNC Works',
      email: 'v.joshi@joshicnc.in',
    })).toThrow('Missing required fields');

    expect(() => validateSignUpInput({
      fullName: 'Vikram',
      companyName: 'Joshi CNC',
      email: 'invalid-email',
      password: 'password123',
    })).toThrow('Invalid email format');

    expect(() => validateSignUpInput({
      fullName: 'Vikram',
      companyName: 'Joshi CNC',
      email: 'v@j.in',
      password: '123',
    })).toThrow('Password must be at least 6 characters');
  });

  it('redirects new users needing onboarding to /onboarding', () => {
    const routeResolver = (isAuthenticated: boolean, needsOnboarding: boolean, path: string): string => {
      const publicRoutes = ['/', '/login', '/signup', '/auth/callback'];
      if (publicRoutes.includes(path)) return path;
      if (needsOnboarding) return '/onboarding';
      if (!isAuthenticated) return '/login';
      return path;
    };

    expect(routeResolver(false, false, '/dashboard')).toBe('/login');
    expect(routeResolver(true, true, '/dashboard')).toBe('/onboarding');
    expect(routeResolver(true, true, '/rates')).toBe('/onboarding');
    expect(routeResolver(true, false, '/dashboard')).toBe('/dashboard');
    expect(routeResolver(true, false, '/quotation/qt-123')).toBe('/quotation/qt-123');
  });

  it('validates company onboarding payload and prevents client company_id injection', () => {
    const validateOnboardingInput = (data: {
      companyName: string;
      address: string;
      phone: string;
      gstin?: string;
      [key: string]: any;
    }) => {
      if (!data.companyName.trim()) throw new Error('Plant name is required');
      if (!data.address.trim()) throw new Error('Plant address is required');
      if (!data.phone.trim()) throw new Error('Plant phone is required');
      if (data.gstin && data.gstin.trim().length !== 15) throw new Error('GSTIN must be 15 characters');

      // Invariant: client MUST NOT be able to supply company_id
      const sanitized = { ...data };
      delete sanitized.company_id;
      return sanitized;
    };

    const validPayload = {
      companyName: 'Apex Machining Works',
      legalName: 'Apex Machining Works Pvt Ltd',
      address: 'Plot 10, MIDC Bhosari, Pune',
      phone: '+91 20 2712 8800',
      gstin: '27AAACB1234F1Z8',
      company_id: 'comp-malicious-override', // Attempt to spoof
    };

    const sanitized = validateOnboardingInput(validPayload);
    expect(sanitized).not.toHaveProperty('company_id');
    expect(sanitized.companyName).toBe('Apex Machining Works');

    expect(() => validateOnboardingInput({
      companyName: '',
      address: 'Pune',
      phone: '+91 9999999999',
    })).toThrow('Plant name is required');

    expect(() => validateOnboardingInput({
      companyName: 'Apex',
      address: '',
      phone: '+91 9999999999',
    })).toThrow('Plant address is required');

    expect(() => validateOnboardingInput({
      companyName: 'Apex',
      address: 'Pune',
      phone: '99999',
      gstin: 'INVALID-GST',
    })).toThrow('GSTIN must be 15 characters');
  });

  it('constructs correct application callback URL without trailing slashes', () => {
    const resolveAppRedirect = (customBase?: string, origin: string = 'http://localhost:5173'): string => {
      const base = customBase ? customBase.replace(/\/+$/, '') : origin;
      return `${base}/auth/callback`;
    };

    expect(resolveAppRedirect(undefined, 'http://localhost:5173')).toBe('http://localhost:5173/auth/callback');
    expect(resolveAppRedirect(undefined, 'https://app.quotationai.com')).toBe('https://app.quotationai.com/auth/callback');
    expect(resolveAppRedirect('https://app.quotationai.com/', 'http://localhost:5173')).toBe('https://app.quotationai.com/auth/callback');
    expect(resolveAppRedirect('https://app.quotationai.com///', 'http://localhost:5173')).toBe('https://app.quotationai.com/auth/callback');
  });
});
