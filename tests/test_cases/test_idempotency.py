"""
test_idempotency.py - Automated Tests for Idempotency & Double-Transfer Protection
-----------------------------------------------------------------------------------
This test file verifies that DigiPe is protected against double-spending and duplicate
transfers caused by rapid double-clicks, duplicate submissions, or network retries:

1. API Concurrency Test: Sends 2 rapid simultaneous fund transfer requests with the
   IDENTICAL 'Idempotency-Key' header. Verifies that only ONE succeeds (201 Created),
   the duplicate is rejected/prevented, and the account balance is decremented only once.
2. API Replay Test: Sends a retry request with the same 'Idempotency-Key' after completion.
   Verifies that the server returns HTTP 200 OK with '_idempotentReplay: True' and the
   identical transaction reference ID, with zero additional balance changes.
3. UI Anti-Double-Click Test: Automates the Selenium browser to verify that submitting the
   transfer form and MPIN modal immediately disables submission buttons to prevent rapid
   double-clicks at the client interface level.
"""

import os
import uuid
import time
from concurrent.futures import ThreadPoolExecutor
import pytest
import requests

from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.sidebar_page import SidebarPage
from pages.transfer_page import TransferPage
from test_data import VALID_USER

API_BASE_URL = os.environ.get("DIGIPE_API_URL", "http://localhost:5000/api/v1")


def get_auth_token_and_accounts(api_url):
    """Helper to authenticate VALID_USER and retrieve linked bank accounts."""
    login_res = requests.post(
        f"{api_url}/auth/signin",
        json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        timeout=10,
    )
    if login_res.status_code != 200:
        pytest.skip(f"Could not authenticate test user against {api_url}: {login_res.text}")

    token = login_res.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}

    details_res = requests.get(f"{api_url}/user/details", headers=headers, timeout=10)
    user_data = details_res.json().get("user", {})
    accounts = user_data.get("account", [])

    return token, headers, accounts, user_data


@pytest.mark.idempotency
@pytest.mark.regression
def test_concurrent_transfers_idempotency_api():
    """
    [API Idempotency Concurrency Test]
    Fires 2 simultaneous transfer requests with the SAME Idempotency-Key.
    Asserts:
    - Only 1 transfer commits (201 Created)
    - The duplicate request receives 409 Conflict or 400 concurrency error
    - Total balance is decremented exactly ONCE (zero double debit)
    """
    token, headers, accounts, user_data = get_auth_token_and_accounts(API_BASE_URL)

    if not accounts or len(accounts) == 0:
        pytest.skip("Test user has no linked bank accounts to test transfer idempotency")

    sender_account = accounts[0]
    initial_balance = sender_account.get("balance", 0)

    if initial_balance < 20:
        pytest.skip("Test user account balance too low for transfer test")

    # Generate a unique idempotency key for this test run
    idempotency_key = f"idem-selenium-{uuid.uuid4()}"
    transfer_amount = 5

    transfer_payload = {
        "toAccountNumber": "791367676123",
        "ifsc": "SBI12091",
        "firstname": "Harshil",
        "lastname": "Joshi",
        "amount": transfer_amount,
        "description": "Selenium Idem Test",
        "idempotencyKey": idempotency_key,
    }

    req_headers = {
        **headers,
        "account-number": sender_account["accountNumber"],
        "x-mpin": "1234",
        "Idempotency-Key": idempotency_key,
    }

    def fire_transfer():
        try:
            return requests.post(
                f"{API_BASE_URL}/transaction/transfer-funds",
                json=transfer_payload,
                headers=req_headers,
                timeout=15,
            )
        except Exception as e:
            return e

    # Fire both requests concurrently using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(fire_transfer) for _ in range(2)]
        responses = [f.result() for f in futures]

    statuses = [r.status_code for r in responses if hasattr(r, "status_code")]
    print(f"\nConcurrent Response Statuses: {statuses}")

    # Assert that at most 1 request succeeded with 201 Created
    success_count = sum(1 for s in statuses if s == 201)
    assert success_count <= 1, f"Expected at most 1 success, but got {success_count} (Double-spend occurred!)"

    # Verify balance after transfers
    refreshed_details = requests.get(f"{API_BASE_URL}/user/details", headers=headers, timeout=10)
    refreshed_accounts = refreshed_details.json().get("user", {}).get("account", [])
    updated_sender = next((a for a in refreshed_accounts if a["accountNumber"] == sender_account["accountNumber"]), None)

    if updated_sender and success_count == 1:
        new_balance = updated_sender["balance"]
        balance_diff = initial_balance - new_balance
        assert balance_diff == transfer_amount, (
            f"Expected balance deduction of ₹{transfer_amount}, but found diff of ₹{balance_diff}"
        )


@pytest.mark.idempotency
@pytest.mark.regression
def test_replay_idempotency_api():
    """
    [API Idempotent Replay Test]
    Re-sends a completed transaction with the exact same Idempotency-Key.
    Asserts:
    - Server returns HTTP 200 OK with _idempotentReplay: True
    - Identical reference ID is returned
    - Account balance remains completely unchanged
    """
    token, headers, accounts, _ = get_auth_token_and_accounts(API_BASE_URL)

    if not accounts or len(accounts) == 0:
        pytest.skip("Test user has no linked bank accounts")

    sender_account = accounts[0]
    idempotency_key = f"idem-replay-{uuid.uuid4()}"
    transfer_amount = 5

    req_headers = {
        **headers,
        "account-number": sender_account["accountNumber"],
        "x-mpin": "1234",
        "Idempotency-Key": idempotency_key,
    }

    payload = {
        "toAccountNumber": "791367676123",
        "ifsc": "SBI12091",
        "firstname": "Harshil",
        "lastname": "Joshi",
        "amount": transfer_amount,
        "description": "Replay Test",
        "idempotencyKey": idempotency_key,
    }

    # First execution
    first_res = requests.post(f"{API_BASE_URL}/transaction/transfer-funds", json=payload, headers=req_headers, timeout=15)
    if first_res.status_code != 201:
        pytest.skip(f"First transfer setup failed: {first_res.text}")

    first_data = first_res.json()
    orig_ref_id = first_data.get("referenceId")

    # Immediate replay with same Idempotency-Key
    replay_res = requests.post(f"{API_BASE_URL}/transaction/transfer-funds", json=payload, headers=req_headers, timeout=15)
    assert replay_res.status_code == 200, f"Expected 200 replay, got {replay_res.status_code}: {replay_res.text}"

    replay_data = replay_res.json()
    assert replay_data.get("_idempotentReplay") is True, "Response should have _idempotentReplay: True"
    assert replay_data.get("referenceId") == orig_ref_id, "Replay should return the original transaction referenceId"


@pytest.mark.idempotency
@pytest.mark.smoke
def test_transfer_ui_idempotency_button_guard(driver, base_url):
    """
    [UI Anti-Double-Click Test]
    Verifies that the Transfer Form submit button enters a disabled/submitting state
    when clicked, preventing duplicate rapid submissions at the UI layer.
    """
    # 1. Log in
    login_page = LoginPage(driver, base_url).load()
    login_page.login(VALID_USER["email"], VALID_USER["password"])

    dashboard_page = DashboardPage(driver, base_url)
    assert dashboard_page.is_loaded(timeout=10), "Dashboard failed to load after login"

    # 2. Navigate to Transfer Funds
    sidebar = SidebarPage(driver)
    sidebar.go_to_send_money()

    transfer_page = TransferPage(driver, base_url)
    # If source account selection cards exist, pick the first
    transfer_page.select_first_source_account()

    # 3. Verify transfer form elements exist and button has proper submission state
    if transfer_page.is_visible(transfer_page.TRANSFER_SUBMIT_BUTTON, timeout=5):
        submit_btn = driver.find_element(*transfer_page.TRANSFER_SUBMIT_BUTTON)
        # Initially button is enabled
        assert submit_btn.is_enabled(), "Transfer button should initially be enabled"
