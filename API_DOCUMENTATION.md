# Lead Forwarder API Documentation

## Overview

The Lead Forwarder API provides endpoints to configure Facebook lead forwarding to external webhooks. This API allows you to:
- Connect Facebook pages and lead forms
- Configure webhook URLs for lead forwarding
- Debug and monitor lead data flow
- Receive Facebook webhook events

## Base URL

- **Production**: `https://simple-lead-forwarder-umtbo.ondigitalocean.app`
- **Development**: `http://localhost:3000`

## Authentication

This API uses Facebook OAuth 2.0 for page access permissions. Configuration is stored server-side for webhook processing.

## API Endpoints

### 1. Facebook Connection

#### POST `/api/facebook/connect`
Initiates Facebook OAuth flow for page connection.

**Request Body:**
```json
{
  "webhookUrl": "https://your-webhook-endpoint.com/webhook"
}
```

**Response:**
```json
{
  "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?..."
}
```

**Errors:**
- `400`: Missing or invalid webhook URL
- `500`: OAuth initiation failed

---

#### GET `/api/facebook/callback`
Handles Facebook OAuth callback and redirects to page selection.

**Query Parameters:**
- `code` (string, required): Facebook OAuth authorization code
- `state` (string, required): Encoded webhook URL
- `error` (string, optional): OAuth error code

**Response:** Redirect to `/select-page` with page data

---

### 2. Page and Form Selection

#### POST `/api/facebook/subscribe`
Subscribes selected page and forms to webhook events.

**Request Body:**
```json
{
  "pageId": "123456789",
  "pageName": "My Facebook Page",
  "pageAccessToken": "EAABwzLix...",
  "forms": [
    {
      "id": "form_123",
      "name": "Contact Form"
    },
    {
      "id": "form_456", 
      "name": "Newsletter Signup"
    }
  ],
  "webhookUrl": "https://your-webhook-endpoint.com/webhook"
}
```

**Legacy Format (Single Form):**
```json
{
  "pageId": "123456789",
  "pageName": "My Facebook Page", 
  "pageAccessToken": "EAABwzLix...",
  "formId": "form_123",
  "formName": "Contact Form",
  "webhookUrl": "https://your-webhook-endpoint.com/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed to webhooks"
}
```

**Errors:**
- `400`: Missing required fields
- `500`: Webhook subscription failed

---

### 3. Webhook Processing

#### POST `/api/webhooks/facebook`
Receives Facebook lead generation webhooks and forwards to configured endpoint.

**Request Headers:**
- `x-hub-signature-256`: Facebook webhook signature
- `Content-Type`: application/json

**Request Body (Facebook Webhook Format):**
```json
{
  "entry": [
    {
      "id": "page_id",
      "time": 1234567890,
      "changes": [
        {
          "value": {
            "leadgen_id": "lead_123",
            "form_id": "form_456",
            "adgroup_id": "adgroup_789",
            "ad_id": "ad_101112",
            "created_time": 1234567890
          },
          "field": "leadgen"
        }
      ]
    }
  ]
}
```

**Lead Data Forwarded to Your Webhook:**
```json
{
  "event": "lead.received",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "lead": {
    "id": "lead_123",
    "form_id": "form_456",
    "form_name": "Contact Form",
    "page_id": "page_id",
    "page_name": "My Facebook Page",
    "created_time": "2023-12-07T10:30:00Z",
    "fields": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890"
    },
    "raw_data": {
      // Full Facebook lead data
    }
  }
}
```

**Response:** 
```json
{
  "success": true
}
```

---

#### GET `/api/webhooks/facebook`
Facebook webhook verification endpoint.

**Query Parameters:**
- `hub.mode`: "subscribe"
- `hub.verify_token`: Verification token
- `hub.challenge`: Challenge string

**Response:** Challenge string (for verification)

---

### 4. Debug and Monitoring

#### GET `/api/debug`
Retrieves debug data for troubleshooting lead flow.

**Response:**
```json
{
  "debug_data": [
    {
      "id": "debug_123",
      "type": "webhook_received",
      "timestamp": "2023-12-07T10:30:00.000Z",
      "success": true,
      "data": {
        "headers": {...},
        "body": {...}
      }
    },
    {
      "id": "debug_124", 
      "type": "lead_processed",
      "timestamp": "2023-12-07T10:30:01.000Z",
      "success": true,
      "data": {
        "leadgenId": "lead_123",
        "pageId": "page_id",
        "formId": "form_456"
      }
    },
    {
      "id": "debug_125",
      "type": "webhook_forwarded", 
      "timestamp": "2023-12-07T10:30:02.000Z",
      "success": true,
      "data": {
        "webhookUrl": "https://your-webhook-endpoint.com/webhook",
        "attempt": 1,
        "status": 200
      }
    }
  ]
}
```

---

#### POST `/api/debug`
Logs debug information (internal use).

**Request Body:**
```json
{
  "type": "webhook_received|lead_processed|webhook_forwarded|error",
  "data": {...},
  "success": true,
  "error": "Error message if any"
}
```

---

#### DELETE `/api/debug`
Clears all debug data.

**Response:**
```json
{
  "success": true,
  "message": "Debug data cleared"
}
```

## Webhook Configuration

### Your Webhook Endpoint

Your webhook endpoint will receive lead data in this format:

```json
{
  "event": "lead.received",
  "timestamp": "2023-12-07T10:30:00.000Z", 
  "lead": {
    "id": "lead_123",
    "form_id": "form_456",
    "form_name": "Contact Form",
    "page_id": "page_id",
    "page_name": "My Facebook Page", 
    "created_time": "2023-12-07T10:30:00Z",
    "fields": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+1234567890",
      "company": "Acme Corp"
    },
    "raw_data": {
      // Complete Facebook API response
    }
  }
}
```

### Webhook Headers

Your webhook will receive these headers:
- `Content-Type: application/json`
- `X-Source: simple-lead-forwarder`
- `X-Timestamp: 2023-12-07T10:30:00.000Z`

### Webhook Response

Your webhook should respond with:
- **Success**: HTTP 200-299 status code
- **Failure**: Any other status code will trigger retry logic

### Retry Logic

The system implements exponential backoff retry logic:
- **Attempts**: Up to 3 retries
- **Timeout**: 30 seconds per attempt
- **Backoff**: 2s, 4s, 8s between retries

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

### Common Error Codes

- **400 Bad Request**: Missing or invalid parameters
- **403 Forbidden**: Invalid webhook signature or verification token
- **404 Not Found**: Configuration not found
- **500 Internal Server Error**: Processing or external API failures

## Rate Limits

- No explicit rate limits are enforced
- Facebook API limits apply to page/form data fetching
- Webhook forwarding has built-in timeout and retry mechanisms

## Security

### Facebook Webhook Verification

All incoming Facebook webhooks are verified using:
- HMAC-SHA256 signature validation
- App secret verification
- Secure token comparison

### HTTPS Requirement

- Production webhooks require HTTPS endpoints
- Self-signed certificates are not supported

### Data Privacy

- No lead data is stored permanently
- Configuration is stored in-memory (resets on restart)
- Debug data is temporary and can be cleared

## SDK Examples

### Node.js Webhook Handler

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const { event, timestamp, lead } = req.body;
  
  if (event === 'lead.received') {
    console.log('New lead received:', {
      id: lead.id,
      form: lead.form_name,
      email: lead.fields.email,
      name: lead.fields.full_name
    });
    
    // Process the lead data
    // Save to database, send email, etc.
    
    res.status(200).json({ received: true });
  } else {
    res.status(400).json({ error: 'Unknown event type' });
  }
});

app.listen(3000);
```

### Python Webhook Handler

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.get_json()
    
    if data.get('event') == 'lead.received':
        lead = data.get('lead', {})
        
        print(f"New lead: {lead.get('fields', {}).get('full_name')}")
        print(f"Email: {lead.get('fields', {}).get('email')}")
        print(f"Form: {lead.get('form_name')}")
        
        # Process the lead
        # Save to database, send notifications, etc.
        
        return jsonify({'received': True}), 200
    
    return jsonify({'error': 'Unknown event'}), 400

if __name__ == '__main__':
    app.run(port=3000)
```

### PHP Webhook Handler

```php
<?php
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data['event'] === 'lead.received') {
    $lead = $data['lead'];
    
    error_log("New lead: " . $lead['fields']['full_name']);
    error_log("Email: " . $lead['fields']['email']);
    
    // Process the lead
    // Save to database, send email, etc.
    
    http_response_code(200);
    echo json_encode(['received' => true]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown event']);
}
?>
```

## Support

For issues or questions:
- GitHub Issues: [Repository Issues](https://github.com/ramborau/simpl-lead-forward/issues)
- Documentation: This API documentation
- Debug endpoint: `/api/debug` for troubleshooting lead flow

## Changelog

### v2.0
- Added multiple form selection support
- Enhanced debug system
- Improved error handling
- Comprehensive API documentation

### v1.9
- In-memory configuration store
- Fixed webhook forwarding issues

### v1.8
- Initial stable release
- Facebook OAuth integration
- Basic webhook forwarding