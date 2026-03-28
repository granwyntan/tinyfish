#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import ssl
import sys
import time
import re

def fetch_tinyfish_data(retry_count=3):
    """Fetch sample SONY headphones data from Tinyfish AI with retries"""
    
    url = "https://agent.tinyfish.ai/v1/automation/run-sse"
    
    for attempt in range(retry_count):
        try:
            print(f"Attempt {attempt + 1}/{retry_count}: Fetching data from Tinyfish AI...", file=sys.stderr)
            
            payload = json.dumps({
                "url": "https://www.google.com/search?q=SONY+headphones+price+buy+online",
                "goal": 'Find real SONY headphones products with actual product URLs from major ecommerce platforms (Shopee, Lazada, Amazon, AliExpress, eBay, Etsy). Extract 8 products with exact fields: platform name, product_name, price in USD, currency, seller/shop name, shipping cost, delivery_time in days, rating (0-5), number of reviews, actual product_url, and brief description. Return ONLY valid JSON in this exact format: {"products": [{"platform": "Platform Name","product_name": "Product Name","price": "123.45","currency": "USD","seller": "Seller Name","shipping": "free or number","delivery_time": "5","rating": "4.8","reviews": "1250","product_url": "https://actual-url-to-product","description": "brief description"}]}'
            }).encode('utf-8')
            
            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': 'sk-tinyfish-wJOCHa5UOF-ShEleth0to1ElW8Qyexkg'
            }
            
            req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
            
            with urllib.request.urlopen(req, timeout=120) as response:
                response_text = response.read().decode('utf-8')
                
                print(f"Received response from Tinyfish", file=sys.stderr)
                
                # Parse SSE stream (Server-Sent Events format)
                lines = response_text.split('\n')
                complete_result = None
                
                for line in lines:
                    if line.startswith('data: '):
                        try:
                            event = json.loads(line[6:])  # Remove 'data: ' prefix
                            
                            if event.get('type') == 'COMPLETE':
                                result = event.get('result', {})
                                if isinstance(result, str):
                                    result = json.loads(result)
                                complete_result = result
                                
                                products = result.get('products', [])
                                if products and len(products) > 0:
                                    print(f"✓ Successfully fetched {len(products)} products", file=sys.stderr)
                                    print(json.dumps(result, indent=2))
                                    return
                        except json.JSONDecodeError:
                            pass
                
                if complete_result is None:
                    raise Exception("No COMPLETE event received from Tinyfish")
                    
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
            print(f"HTTP Error on attempt {attempt + 1}: {e.code} - {error_body}", file=sys.stderr)
            if attempt < retry_count - 1:
                time.sleep(2 ** attempt)
                continue
            raise Exception(f"HTTP {e.code}: {error_body}")
        except urllib.error.URLError as e:
            print(f"Network error on attempt {attempt + 1}: {e}", file=sys.stderr)
            if attempt < retry_count - 1:
                time.sleep(2 ** attempt)
                continue
            raise
        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {e}", file=sys.stderr)
            if attempt < retry_count - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    
    raise Exception("Failed to fetch data after all retries")

if __name__ == "__main__":
    try:
        fetch_tinyfish_data()
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
