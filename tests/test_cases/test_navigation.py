"""
test_navigation.py - Automated UI Tests for DigiPe Navigation & Pages
---------------------------------------------------------------------
This file verifies navigation between key DigiPe pages after authentication:
1. Navigating through all key pages using the Sidebar:
   - Dashboard (/user/dashboard)
   - Link Account (/user/create-account)
   - Transactions Ledger (/user/transactions)
   - Security Settings (/user/security)
   - Send Money (/user/transferfunds)
2. User Logout flow:
   - Verifies clicking Log Out ends the session and returns to /signin
   - Verifies protected routes cannot be accessed after logging out
"""

import pytest
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.sidebar_page import SidebarPage
from test_data import VALID_USER


@pytest.mark.smoke
def test_navigation_between_pages(driver, base_url):
    """
    [Navigation Test]
    Logs in and verifies that clicking each Sidebar link navigates to the correct page:
    1. Link Account -> /user/create-account
    2. Transactions -> /user/transactions
    3. Security     -> /user/security
    4. Send Money   -> /user/transferfunds
    5. Dashboard    -> /user/dashboard
    """
    # Step 1: Login
    LoginPage(driver, base_url).load().login(VALID_USER["email"], VALID_USER["password"])
    dashboard = DashboardPage(driver, base_url)
    assert dashboard.is_loaded(), "Dashboard should load after login"

    sidebar = SidebarPage(driver)

    # Step 2: Navigate to 'Link Account'
    sidebar.go_to_link_account()
    sidebar.wait_for_url_contains("/user/create-account")
    assert "/user/create-account" in driver.current_url, "Should navigate to Link Account"

    # Step 3: Navigate to 'Transactions'
    sidebar.go_to_transactions()
    sidebar.wait_for_url_contains("/user/transactions")
    assert "/user/transactions" in driver.current_url, "Should navigate to Transactions"

    # Step 4: Navigate to 'Security'
    sidebar.go_to_security()
    sidebar.wait_for_url_contains("/user/security")
    assert "/user/security" in driver.current_url, "Should navigate to Security"

    # Step 5: Navigate to 'Send Money'
    sidebar.go_to_send_money()
    sidebar.wait_for_url_contains("/user/transferfunds")
    assert "/user/transferfunds" in driver.current_url, "Should navigate to Send Money"

    # Step 6: Return to 'Dashboard'
    sidebar.go_to_dashboard()
    sidebar.wait_for_url_contains("/user/dashboard")
    assert "/user/dashboard" in driver.current_url, "Should navigate back to Dashboard"


def test_user_logout_flow(driver, base_url):
    """
    [Logout Flow Test]
    Verifies that clicking 'Log Out' in the sidebar successfully terminates the session,
    redirects the user back to /signin, and prevents navigating back to protected pages.
    """
    # Step 1: Login
    LoginPage(driver, base_url).load().login(VALID_USER["email"], VALID_USER["password"])
    DashboardPage(driver, base_url).is_loaded()

    # Step 2: Click Log Out
    sidebar = SidebarPage(driver)
    sidebar.click_logout()

    # Step 3: Verify redirect to /signin
    sidebar.wait_for_url_contains("/signin", timeout=5)
    assert "/signin" in driver.current_url, "User should be redirected to /signin upon logout"

    # Step 4: Attempt to visit protected dashboard directly
    driver.get(f"{base_url.rstrip('/')}/user/dashboard")
    sidebar.wait_for_url_contains("/signin", timeout=5)
    assert "/signin" in driver.current_url, (
        "Unauthenticated user should be redirected back to /signin by ProtectedRoute"
    )
