"""Shared requests wrapper utilities with randomized pacing.

Use these helpers for external HTTP calls that should avoid bursty traffic.
"""

from __future__ import annotations

import random
import time
from typing import Any

import requests


def delayed_request(
    method: str,
    url: str,
    *,
    min_timeout_seconds: float = 1.0,
    max_timeout_seconds: float = 5.0,
    request_timeout_seconds: float = 30.0,
    **kwargs: Any,
) -> requests.Response:
    """Send an HTTP request after a randomized delay.

    The randomized delay helps stagger repeated requests so multiple workers do
    not hit external sites in tight bursts.

    Args:
        method: HTTP method, such as "GET" or "POST".
        url: Request target URL.
        min_timeout_seconds: Minimum delay before the request is sent.
        max_timeout_seconds: Maximum delay before the request is sent.
        request_timeout_seconds: Network timeout passed to requests.
        **kwargs: Additional keyword args passed through to requests.request.

    Returns:
        requests.Response: The HTTP response object.

    Raises:
        ValueError: If timeout bounds are invalid.
        requests.RequestException: Any requests-layer failure.
    """
    if min_timeout_seconds < 0 or max_timeout_seconds < 0:
        raise ValueError("Timeout values must be non-negative.")
    if min_timeout_seconds > max_timeout_seconds:
        raise ValueError("min_timeout_seconds cannot be greater than max_timeout_seconds.")

    wait_seconds = random.uniform(min_timeout_seconds, max_timeout_seconds)
    time.sleep(wait_seconds)

    return requests.request(
        method=method,
        url=url,
        timeout=request_timeout_seconds,
        **kwargs,
    )


def delayed_get(
    url: str,
    *,
    min_timeout_seconds: float = 1.0,
    max_timeout_seconds: float = 5.0,
    request_timeout_seconds: float = 30.0,
    **kwargs: Any,
) -> requests.Response:
    """Send a GET request after a randomized delay.

    This is a convenience wrapper around ``delayed_request``.
    """
    return delayed_request(
        "GET",
        url,
        min_timeout_seconds=min_timeout_seconds,
        max_timeout_seconds=max_timeout_seconds,
        request_timeout_seconds=request_timeout_seconds,
        **kwargs,
    )
