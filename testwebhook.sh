#!/bin/bash

# 1. Configuration
TUNNEL_URL="https://replace-this-with-a-url/" # replace with actual tunnel url
SECRET_KEY="sk_test_key_here" # Replace with your actual Paystack Secret Key
BODY='{"test":true}'

# 2. Generate HMAC-SHA512 Signature
# echo -n ensures no trailing newline is added to the body before hashing
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha512 -hmac "$SECRET_KEY" | awk '{print $2}')

echo "Generated Signature: $SIGNATURE"

# 3. Send the Request
curl -v -X POST "$TUNNEL_URL" \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$BODY"   