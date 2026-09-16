"""
sidebar_page.py - Page Object for the Navigation Sidebar
---------------------------------------------------------
Encapsulates the persistent navigation sidebar in the user layout:
- Navigating to Dashboard, Send Money, Link Account, Transactions, Security
- Performing user logout
"""

from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class SidebarPage(BasePage):
    # ==========================================
    # 1. Locators (Matches DigiPe's Sidebar.jsx)
    # ==========================================
    DASHBOARD_LINK = (By.XPATH, "//aside//button[contains(., 'Dashboard')]")
    SEND_MONEY_LINK = (By.XPATH, "//aside//button[contains(., 'Send Money')]")
    LINK_ACCOUNT_LINK = (By.XPATH, "//aside//button[contains(., 'Link Account')]")
    TRANSACTIONS_LINK = (By.XPATH, "//aside//button[contains(., 'Transactions')]")
    SECURITY_LINK = (By.XPATH, "//aside//button[contains(., 'Security')]")
    LOGOUT_BUTTON = (By.XPATH, "//aside//button[contains(., 'Log Out')]")

    # ==========================================
    # 2. Navigation Actions
    # ==========================================
    def go_to_dashboard(self):
        """Clicks the Dashboard link in the sidebar."""
        self.click(self.DASHBOARD_LINK)

    def go_to_send_money(self):
        """Clicks the Send Money link in the sidebar."""
        self.click(self.SEND_MONEY_LINK)

    def go_to_link_account(self):
        """Clicks the Link Account link in the sidebar."""
        self.click(self.LINK_ACCOUNT_LINK)

    def go_to_transactions(self):
        """Clicks the Transactions link in the sidebar."""
        self.click(self.TRANSACTIONS_LINK)

    def go_to_security(self):
        """Clicks the Security link in the sidebar."""
        self.click(self.SECURITY_LINK)

    def click_logout(self):
        """Clicks the Log Out button in the sidebar."""
        self.click(self.LOGOUT_BUTTON)
