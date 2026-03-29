curl -X POST "${API_ENDPOINT:-http://localhost:8080}/analytics/aggregate" \
  -H "Authorization: Bearer ${SERVER_SECRET:-server-secret}" \
  -H "Content-Type: application/json" \
  --silent --show-error
