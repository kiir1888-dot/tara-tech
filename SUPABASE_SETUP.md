# Tara Tech Supabase Setup

The project uses one Supabase schema for administrator profiles, news, events, team members, contact inquiries, and website images.

## 1. Create the database and storage policies

1. Create or open your Supabase project.
2. In **SQL Editor**, open a new query.
3. Paste and run all of `supabase-schema.sql`.

The script creates:

- `profiles`, linked to `auth.users`
- `news`
- `events`
- `team`
- `contact_inquiries`
- The public `website-assets` Storage bucket
- RLS policies for public reads, public inquiry submission, and admin-only content writes
- A trigger that creates a `profiles` row with role `user` whenever a user signs up

The bucket allows JPG, PNG, WebP, and GIF files up to 5 MB. Public image URLs are readable by anyone. Upload, replacement, and deletion require an authenticated user whose profile role is `admin`.

## 2. Configure the browser client

In **Project Settings > API**, copy the project URL and public anon key into `supabase-config.js`:

```js
window.TARA_SUPABASE = Object.freeze({
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_KEY'
});
```

The anon key is safe to use in the browser because RLS enforces authorization. Never add the service-role key to this project or any frontend file.

The official `@supabase/supabase-js` CDN script, `supabase-config.js`, and `supabase-client.js` must load in that order. The current `index.html` and `admin.html` already use this order.

## 3. Create and promote the administrator

1. Open `admin.html` over HTTPS or localhost.
2. Create the administrator account and confirm its email if required.
3. In **Authentication > Users**, copy that user's UUID.
4. In **SQL Editor**, run the following once, replacing the placeholder:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_AUTH_USER_UUID';
```

5. Confirm that one row was updated. The dashboard will reject the account until its profile role is exactly `admin`.

You can also create the user from **Authentication > Users > Add user**. The database trigger automatically creates the corresponding `profiles` row.

## 4. Configure authentication redirects

In **Authentication > URL Configuration**:

1. Set **Site URL** to the deployed website, such as `https://example.com`.
2. Add `https://example.com/admin.html` to **Redirect URLs**.
3. For local testing, add `http://localhost:8000/admin.html`.

Password creation and recovery links require HTTP or HTTPS and do not work correctly from a `file://` page.

## 5. Test the security rules

Before launch, verify these cases:

- A signed-out visitor can read `news`, `events`, and `team`.
- A signed-out visitor can submit a contact inquiry but cannot read inquiries.
- A normal authenticated user cannot create, update, or delete content or files.
- An authenticated admin can manage content and images and can call `fetchInquiries()`.
- Public users cannot change `profiles.role`.

## Frontend API

`supabase-client.js` exposes `window.TaraSupabaseAPI` with:

- `adminLogin` and `checkAdminStatus`
- `postNews`, `updateNews`, and `deleteNews`
- `createEvent`, `updateEvent`, and `deleteEvent`
- `addTeamMember`, `updateTeamMember`, and `deleteTeamMember`
- `submitInquiry` and `fetchInquiries`

Every image helper uploads into a content-specific folder inside `website-assets`, saves the resulting public URL, and removes replaced or deleted managed images.
