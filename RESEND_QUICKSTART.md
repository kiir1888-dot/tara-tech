# Resend Quickstart (after DNS is verified)

Use this once your Resend domain status becomes `verified`.

## 1) Set Edge Function secrets in Supabase

In Supabase Dashboard -> Edge Functions -> Secrets, add:

- `RESEND_API_KEY` = your Resend API key
- `INQUIRY_FROM_EMAIL` = `notifications@taratech.dev`
- `INQUIRY_TO_EMAIL` = `tara.tech211@gmail.com`

## 2) Deploy function

Deploy function name: `send-inquiry-email`

Source file already prepared in this repo:

- `supabase/functions/send-inquiry-email/index.ts`

## 3) Add database webhook

In Supabase Dashboard -> Database -> Webhooks -> Create webhook:

- Name: `contact-inquiry-email`
- Table: `public.contact_inquiries`
- Events: `INSERT`
- Method: `POST`
- URL: your deployed function URL

## 4) Test

1. Submit contact form on the website.
2. Confirm row appears in `public.contact_inquiries`.
3. Confirm inquiry email arrives in `tara.tech211@gmail.com`.

If email does not arrive, check function logs in Supabase and Resend logs.
