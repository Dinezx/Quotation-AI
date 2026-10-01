import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanyLogo } from '../components/common/CompanyLogo';

// Mock useCompanyLogo hook
vi.mock('../hooks/useCompanyLogo', () => ({
  useCompanyLogo: vi.fn(() => ({
    logoUrl: null,
    hasLogo: false,
    isLoading: false,
    loadError: false,
  })),
}));

describe('CompanyLogo Component', () => {
  it('renders My Profile empty state with "No company logo uploaded" and manage button', () => {
    const handleManage = vi.fn();
    render(
      <CompanyLogo
        variant="profile"
        onManageInSettings={handleManage}
        companyName="Test Mfg Ltd"
      />
    );

    expect(screen.getByText('Official Company Logo')).toBeInTheDocument();
    expect(screen.getByText('No company logo uploaded')).toBeInTheDocument();
    const manageBtns = screen.getAllByText(/Company Settings/i);
    expect(manageBtns.length).toBeGreaterThan(0);

    fireEvent.click(manageBtns[0]);
    expect(handleManage).toHaveBeenCalledTimes(1);
  });

  it('renders My Profile with active logo and proportional preservation', () => {
    render(
      <CompanyLogo
        variant="profile"
        overrideLogoUrl="blob:http://localhost/test-logo-uuid"
        companyName="Test Mfg Ltd"
      />
    );

    expect(screen.getByText('Official Company Logo')).toBeInTheDocument();
    expect(screen.getByText('Test Mfg Ltd')).toBeInTheDocument();
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'blob:http://localhost/test-logo-uuid');
    expect(img).toHaveClass('object-contain');
  });

  it('renders settings upload variant with placeholder when empty', () => {
    render(<CompanyLogo variant="settings" />);
    expect(screen.getByText('No Logo')).toBeInTheDocument();
  });

  it('renders settings upload variant with image when logo exists', () => {
    render(
      <CompanyLogo
        variant="settings"
        overrideLogoUrl="blob:http://localhost/test-logo-uuid"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'blob:http://localhost/test-logo-uuid');
    expect(img).toHaveClass('object-contain');
  });

  it('renders template preview placeholder when showPlaceholderIfEmpty=true', () => {
    render(
      <CompanyLogo
        variant="preview"
        showPlaceholderIfEmpty={true}
        placeholderText="Logo not uploaded"
      />
    );
    expect(screen.getByText('Logo not uploaded')).toBeInTheDocument();
  });

  it('hides in template preview when showPlaceholderIfEmpty=false and no logo', () => {
    const { container } = render(
      <CompanyLogo
        variant="preview"
        showPlaceholderIfEmpty={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders template preview image with positioning classes', () => {
    const { rerender } = render(
      <CompanyLogo
        variant="preview"
        position="left"
        overrideLogoUrl="https://example.com/logo.png"
      />
    );
    let img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');

    rerender(
      <CompanyLogo
        variant="preview"
        position="center"
        overrideLogoUrl="https://example.com/logo.png"
      />
    );
    expect(screen.getByRole('img')).toBeInTheDocument();

    rerender(
      <CompanyLogo
        variant="preview"
        position="right"
        overrideLogoUrl="https://example.com/logo.png"
      />
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders thumbnail variant with small dimensions and object-contain', () => {
    render(
      <CompanyLogo
        variant="thumbnail"
        overrideLogoUrl="https://example.com/logo.png"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveClass('object-contain');
    expect(img.style.maxHeight).toBe('16px');
    expect(img.style.maxWidth).toBe('40px');
  });
});
