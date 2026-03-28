#!/usr/bin/env python3
import json
import urllib.request
import sys

url = "https://api.tinyfish.ai/agent"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk-tinyfish-wJOCHa5UOF-ShEleth0to1ElW8Qyexkg"
}

data = {
    "url": "https://www.google.com/search?q=SONY+headphones",
    "goal": 'Search for SONY headphones on Shopee, Lazada, Amazon, AliExpress, eBay and Etsy. Extract 2 bestselling products from each platform with these EXACT fields: platform, product_name, price, currency, seller, shipping, delivery_time, rating, reviews, product_url, description. Return only valid JSON in this format: {"products": [{"platform": "Shopee", "product_name": "SONY WH-1000XM5", "price": "299.99", "currency": "USD", "seller": "Official Store", "shipping": "free", "delivery_time": "3", "rating": "4.8", "reviews": "1500", "product_url": "https://example.com", "description": "Premium noise cancelling headphones"}]}',
    "stream": False
}

try:
    req_data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=req_data, headers=headers, method='POST')
    with urllib.request.urlopen(req, timeout=45) as response:
        result = json.loads(response.read().decode('utf-8'))
        print(json.dumps(result, indent=2))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
