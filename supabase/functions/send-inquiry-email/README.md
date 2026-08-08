# send-inquiry-email

Supabase Edge Function that receives a `contact_inquiries` insert payload and sends an email alert through Resend.

## Required secrets

Set these in Supabase Edge Functions secrets:

- `RESEND_API_KEY`
- `INQUIRY_FROM_EMAIL` (example: `notifications@taratech.dev`)
- `INQUIRY_TO_EMAIL` (example: `tara.tech211@gmail.com`)

## Deploy

Use Supabase dashboard or CLI to deploy the function named `send-inquiry-email`.

## Webhook

Create a Database Webhook in Supabase:

- Table: `public.contact_inquiries`
- Event: `INSERT`
- Method: `POST`
- URL: the deployed function URL

This lets each new inquiry trigger an email alert automatically.
