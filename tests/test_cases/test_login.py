"""
test_login.py - Automated UI Tests for DigiPe Login Flow
---------------------------------------------------------
This file contains automated tests for the Sign-in page:
1. Positive test: Valid login redirects to /user/dashboard
2. Negative test: Valid email with incorrect password shows 'Invalid Password'
3. Negative test: Non-existent email shows 'Invalid Email'
4. Form validation: Empty fields prevent form submission
5. Form validation: Invalid email format (missing @) triggers browser validation
"""

import pytest
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from test_data import (
    VALID_USER,
    INVALID_PASSWORD_USER,
    NON_EXISTENT_USER,
    ERROR_INVALID_PASSWORD,
    ERROR_INVALID_EMAIL
)


@pytest.mark.smoke
def test_valid_login(driver, base_url):
    """
    [Positive Test]
    Verifies that a registered user can log in with valid credentials
    and is successfully redirected to the Dashboard (/user/dashboard).
    """
    # Step 1: Open the login page
    login_page = LoginPage(driver, base_url).load()

    # Step 2: Enter valid credentials and submit
    login_page.login(VALID_USER["email"], VALID_USER["password"])

    # Step 3: Wait for redirection to the dashboard
    dashboard_page = DashboardPage(driver, base_url)
    assert dashboard_page.is_loaded(), "Dashboard should be visible after successful login"
    assert "/user/dashboard" in driver.current_url, "URL should contain /user/dashboard"

    # Step 4: Verify the welcome banner displays the user's name
    welcome_text = dashboard_page.get_welcome_text()
    assert VALID_USER["firstname"] in welcome_text, f"Welcome text should include {VALID_USER['firstname']}"


@pytest.mark.negative
def test_invalid_password(driver, base_url):
    """
    [Negative Test]
    Verifies that submitting a valid email with the wrong password
    displays the 'Invalid Password' error banner and keeps the user on /signin.
    """
    # Step 1: Open login page
    login_page = LoginPage(driver, base_url).load()

    # Step 2: Enter valid email but incorrect password
    login_page.login(INVALID_PASSWORD_USER["email"], INVALID_PASSWORD_USER["password"])

    # Step 3: Verify the error alert appears with correct message
    assert login_page.is_error_displayed(), "Error banner should appear for incorrect password"
    assert ERROR_INVALID_PASSWORD in login_page.get_error_message(), (
        f"Expected '{ERROR_INVALID_PASSWORD}' error message"
    )

    # Step 4: Verify user is still on the signin page
    assert "/signin" in driver.current_url or driver.current_url.endswith("/"), (
        "User should remain on signin page"
    )


@pytest.mark.negative
def test_non_existent_email(driver, base_url):
    """
    [Negative Test]
    Verifies that attempting to sign in with an unregistered email
    displays the 'Invalid Email' error banner.
    """
    login_page = LoginPage(driver, base_url).load()
    login_page.login(NON_EXISTENT_USER["email"], NON_EXISTENT_USER["password"])

    assert login_page.is_error_displayed(), "Error banner should appear for unregistered email"
    assert ERROR_INVALID_EMAIL in login_page.get_error_message(), (
        f"Expected '{ERROR_INVALID_EMAIL}' error message"
    )


def test_empty_fields_validation(driver, base_url):
    """
    [Form Validation Test]
    Verifies that clicking 'Sign in' with empty input fields triggers
    HTML5 'required' validation and stops form submission.
    """
    login_page = LoginPage(driver, base_url).load()

    # Click submit without typing anything
    login_page.click_signin()

    # Email input has the 'required' HTML attribute, so browser marks it invalid
    assert not login_page.is_email_valid(), "Empty email field should be marked invalid by browser"
    assert "/signin" in driver.current_url or driver.current_url.endswith("/"), (
        "Form submission should be blocked"
    )


def test_invalid_email_format(driver, base_url):
    """
    [Form Validation Test]
    Verifies that entering a string without '@' or domain (e.g. 'bademail')
    fails HTML5 email format validation.
    """
    login_page = LoginPage(driver, base_url).load()

    # Type an invalid email string
    login_page.enter_email("bademailformat")
    login_page.enter_password("any_password")
    login_page.click_signin()

    # Browser flags input[type='email'] as invalid
    assert not login_page.is_email_valid(), "Email without '@' should be marked invalid by browser"
    assert "/user/dashboard" not in driver.current_url, "User should not be navigated away"
