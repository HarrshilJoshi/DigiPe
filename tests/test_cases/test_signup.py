"""
test_signup.py - Automated UI Tests for DigiPe Registration Flow
-----------------------------------------------------------------
This file contains automated tests for the Sign-up page:
1. Positive test: Successful registration with new credentials redirects to /signin
2. Negative test: Attempting to register with an already registered email shows an error
3. Form validation: Submitting with empty fields is prevented by browser validation
"""

import pytest
from pages.signup_page import SignupPage
from test_data import (
    VALID_USER,
    ERROR_DUPLICATE_USER,
    generate_random_user
)


@pytest.mark.smoke
def test_valid_signup(driver, base_url):
    """
    [Positive Test]
    Verifies that a new user can register by filling all required fields,
    and is redirected to the /signin page upon successful registration.
    """
    # Step 1: Open the signup page
    signup_page = SignupPage(driver, base_url).load()

    # Step 2: Generate random, unique user data to avoid duplicate collisions
    new_user = generate_random_user()

    # Step 3: Fill out the registration form and submit
    signup_page.register(new_user)

    # Step 4: Verify the user is redirected to the /signin page
    signup_page.wait_for_url_contains("/signin", timeout=10)
    assert "/signin" in driver.current_url, (
        "User should be redirected to /signin after successful registration"
    )


@pytest.mark.negative
def test_duplicate_email_signup(driver, base_url):
    """
    [Negative Test]
    Verifies that trying to register with an email that is already taken
    displays the 'Email or username already taken' error banner.
    """
    # Step 1: Open the signup page
    signup_page = SignupPage(driver, base_url).load()

    # Step 2: Prepare registration data using an existing user's email
    duplicate_user = generate_random_user()
    duplicate_user["email"] = VALID_USER["email"]  # john@example.com is already registered

    # Step 3: Submit form
    signup_page.register(duplicate_user)

    # Step 4: Verify the error message
    assert signup_page.is_error_displayed(), "Error banner should appear for duplicate email"
    error_msg = signup_page.get_error_message()
    assert ERROR_DUPLICATE_USER in error_msg, (
        f"Expected error '{ERROR_DUPLICATE_USER}', but got '{error_msg}'"
    )


def test_empty_signup_fields_validation(driver, base_url):
    """
    [Form Validation Test]
    Verifies that clicking 'Create Free Account' without filling in inputs
    is blocked by HTML5 required field validation.
    """
    signup_page = SignupPage(driver, base_url).load()

    # Click submit without typing anything
    signup_page.click_submit()

    # Verify user remains on the signup page
    assert "/signup" in driver.current_url, "User should remain on /signup when fields are empty"
