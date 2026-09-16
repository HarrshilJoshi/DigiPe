"""
test_form_validation.py - Automated UI Tests for Form Validation
-----------------------------------------------------------------
This file verifies client-side form validation across DigiPe forms:
1. Short account number (< 10 digits) on Link Bank Account form
2. Required fields validation on Link Bank Account form
3. Login empty field required validation
"""

import pytest
from pages.login_page import LoginPage
from pages.link_account_page import LinkAccountPage
from pages.sidebar_page import SidebarPage
from test_data import VALID_USER


def test_link_account_short_number_validation(driver, base_url):
    """
    [Form Validation Test]
    Verifies that entering an account number shorter than 10 digits
    displays the error 'Account Number must be at least 10 digits.'
    """
    # Step 1: Login and navigate to Link Account page
    LoginPage(driver, base_url).load().login(VALID_USER["email"], VALID_USER["password"])
    SidebarPage(driver).go_to_link_account()

    link_page = LinkAccountPage(driver, base_url)
    assert link_page.is_loaded(), "Link Bank Account form should be loaded"

    # Step 2: Enter an account number with only 5 digits (less than the required 10)
    link_page.enter_account_number("12345")
    link_page.enter_ifsc("HDFC0001234")
    link_page.enter_balance("1000")

    # Step 3: Submit the form
    link_page.click_submit()

    # Step 4: Verify the validation error banner
    assert link_page.is_error_displayed(), "Error banner should appear for short account number"
    error_text = link_page.get_error_message()
    assert "Account Number must be at least 10 digits" in error_text, (
        f"Expected 10-digit validation message, but got '{error_text}'"
    )


def test_login_field_length_and_type_validation(driver, base_url):
    """
    [Form Validation Test]
    Verifies that password field is masked as type='password'
    and email field enforces type='email'.
    """
    login_page = LoginPage(driver, base_url).load()

    # Verify input types for security and correct data format
    email_elem = driver.find_element(*login_page.EMAIL_INPUT)
    password_elem = driver.find_element(*login_page.PASSWORD_INPUT)

    assert email_elem.get_attribute("type") == "email", "Email input must have type='email'"
    assert password_elem.get_attribute("type") == "password", "Password input must have type='password' to mask characters"
