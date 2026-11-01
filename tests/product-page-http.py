import argparse
import json
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import ProxyHandler, build_opener


opener = build_opener(ProxyHandler({}))


def get(url):
    try:
        response = opener.open(url, timeout=30)
    except HTTPError as error:
        response = error
    with response:
        return response.status, response.read().decode("utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:3000")
    base = parser.parse_args().base_url.rstrip("/")
    status, body = get(base + "/api/products?limit=1")
    assert status == 200, f"Catalog returned HTTP {status}"
    product = json.loads(body)["data"]["items"][0]
    status, body = get(base + "/products/" + quote(product["slug"], safe=""))
    assert status == 200, f"Active product returned HTTP {status}"
    assert 'data-product-details="storefront"' in body
    assert f'data-product-id="{product["id"]}"' in body

    for slug in ["regression-product-that-does-not-exist", "invalid_slug"]:
        status, body = get(base + "/products/" + slug)
        assert status in (200, 404), f"Missing product returned HTTP {status}"
        assert 'name="robots" content="noindex"' in body
        assert 'data-product-details="storefront"' not in body
    print("Product HTTP checks passed: active, missing, and invalid slugs.")


if __name__ == "__main__":
    main()
