"""
conftest.py - Pytest Fixtures and Global Configuration
-------------------------------------------------------
In pytest, 'fixtures' are helper functions that prepare everything before a test runs
(like opening a browser) and clean up after it finishes (like closing the browser).

Any test function can use 'driver' or 'base_url' simply by naming them in its arguments:
    def test_example(driver, base_url):
        driver.get(base_url)
"""

import os
from datetime import datetime
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from webdriver_manager.chrome import ChromeDriverManager


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Captures a screenshot automatically whenever a test fails during execution,
    saves it to tests/screenshots/, and embeds it into report.html.
    """
    outcome = yield
    report = outcome.get_result()
    setattr(item, f"rep_{report.when}", report)

    # Capture screenshot only if the test failed during the 'call' phase
    if report.when == "call" and report.failed:
        driver = item.funcargs.get("driver", None)
        if driver:
            # Create tests/screenshots directory if it doesn't exist
            screenshots_dir = os.path.join(os.path.dirname(__file__), "screenshots")
            os.makedirs(screenshots_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in item.name)
            screenshot_filename = f"FAIL_{safe_name}_{timestamp}.png"
            screenshot_path = os.path.join(screenshots_dir, screenshot_filename)

            try:
                driver.save_screenshot(screenshot_path)
                print(f"\n📸 [SCREENSHOT CAPTURED]: {screenshot_path}")

                # Embed screenshot in pytest-html report
                pytest_html = item.config.pluginmanager.getplugin("html")
                if pytest_html:
                    extra = getattr(report, "extra", [])
                    extra.append(pytest_html.extras.image(f"screenshots/{screenshot_filename}"))
                    report.extra = extra
            except Exception as e:
                print(f"\n⚠️ [SCREENSHOT CAPTURE FAILED]: {e}")


def pytest_addoption(parser):
    """
    Adds custom command-line flags to pytest.
    Example usage:
        pytest --headless
        pytest --base-url http://localhost:3000
    """
    parser.addoption(
        "--headless",
        action="store_true",
        default=False,
        help="Run tests in background without opening a visible browser window."
    )
    parser.addoption(
        "--base-url",
        action="store",
        default="https://digipe.vercel.app",
        help="Base URL of the DigiPe frontend application."
    )


@pytest.fixture(scope="session")
def base_url(request):
    """Provides the base URL of the application to any test that requests it."""
    return request.config.getoption("--base-url")


@pytest.fixture(scope="function")
def driver(request):
    """
    Fixture that initializes and provides a clean Selenium Chrome WebDriver instance
    for every test function, and automatically closes it when the test completes.
    """
    # 1. Configure Chrome options
    options = ChromeOptions()
    
    # Run without visible UI if --headless flag is passed in terminal
    if request.config.getoption("--headless"):
        options.add_argument("--headless=new")
    
    # Standard settings for smooth testing
    options.add_argument("--start-maximized")
    options.add_argument("--disable-notifications")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    # 2. Automatically install/manage the matching ChromeDriver version
    service = ChromeService(ChromeDriverManager().install())
    browser = webdriver.Chrome(service=service, options=options)

    # 3. Set implicit wait (maximum seconds to wait when looking for elements)
    browser.implicitly_wait(5)

    # 4. Give the browser to the test function
    yield browser

    # 5. Teardown: Close the browser after test finishes
    browser.quit()
