/**
 * E2E Tests: Authentication Flows
 * 
 * Tests login, logout, and protected route behavior
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Check for login form elements
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should have link to register', async ({ page }) => {
      await page.goto('/auth/login')
      
      const registerLink = page.getByRole('link', { name: /sign up|register|create account/i })
      await expect(registerLink).toBeVisible()
    })

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/auth/login')
      
      const forgotLink = page.getByRole('link', { name: /forgot.*password/i })
      await expect(forgotLink).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login')
      
      await page.getByLabel(/email/i).fill('invalid@example.com')
      await page.getByLabel(/password/i).fill('wrongpassword')
      await page.getByRole('button', { name: /sign in/i }).click()
      
      // Should show an error message (not raw error)
      await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/auth/register')
      
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i).first()).toBeVisible()
    })

    test('should have link to login', async ({ page }) => {
      await page.goto('/auth/register')
      
      const loginLink = page.getByRole('link', { name: /sign in|log in|already have/i })
      await expect(loginLink).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from /dashboard to login', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Should be redirected to login
      await expect(page).toHaveURL(/auth\/login/)
    })

    test('should redirect unauthenticated users from /admin to login', async ({ page }) => {
      await page.goto('/admin')
      
      // Should be redirected to login
      await expect(page).toHaveURL(/auth\/login/)
    })
  })
})

test.describe('Landing Page', () => {
  test('should display VizDots branding', async ({ page }) => {
    await page.goto('/')
    
    // Check for brand name
    await expect(page.getByText(/vizdots/i)).toBeVisible()
  })

  test('should have sign in CTA', async ({ page }) => {
    await page.goto('/')
    
    // Check for sign in link/button
    const signInLink = page.getByRole('link', { name: /sign in|get started|log in/i })
    await expect(signInLink.first()).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Page should not have horizontal scroll
    const body = page.locator('body')
    const scrollWidth = await body.evaluate((el) => el.scrollWidth)
    const clientWidth = await body.evaluate((el) => el.clientWidth)
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // Small tolerance
  })
})

test.describe('404 Page', () => {
  test('should show friendly 404 for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz')
    
    // Should show custom 404 message
    await expect(page.getByText(/couldn.*find|not found|404/i)).toBeVisible()
  })

  test('should have navigation back to home', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz')
    
    // Should have a link to go back
    const homeLink = page.getByRole('link', { name: /home|dashboard|back/i })
    await expect(homeLink.first()).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should have skip link', async ({ page }) => {
    await page.goto('/')
    
    // Skip link should be present (hidden until focused)
    const skipLink = page.locator('.skip-link')
    await expect(skipLink).toBeAttached()
  })

  test('login form should have proper labels', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Check that inputs have associated labels
    const emailInput = page.getByLabel(/email/i)
    const passwordInput = page.getByLabel(/password/i)
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Tab through the form
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // An element should be focused
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })
})
