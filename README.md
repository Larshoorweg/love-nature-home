# Love Nature Krabi website

Static site for Love Nature Krabi Travel and Tours, deployed on Vercel.

- Pages are plain HTML with clean URLs (`/about`, `/destinations/hong-islands`, ...).
- `site.js` handles the menu, scroll reveals, the home hero video, the destinations rail and the contact form.
- `api/contact.js` is a Vercel function that sends contact form messages through SendGrid.
- Tour booking lives on the booking subdomain: https://lovenaturekrabi.jaithaitravel.com

## Environment variables (Vercel, Project Settings, Environment Variables)

| Name | Required | Value |
| --- | --- | --- |
| `SENDGRID_API_KEY` | yes | SendGrid API key with Mail Send access |
| `CONTACT_FROM` | yes | Verified sender address, e.g. `contact@lovenaturekrabi.com` |
| `CONTACT_FROM_NAME` | no | Defaults to "Love Nature Krabi Website" |
| `CONTACT_TO` | no | Defaults to `contact@lovenaturekrabi.com` |

Redeploy after changing a variable.

## Before launch

Every page carries `<meta name="robots" content="noindex">` while placeholder tour cards and
legal placeholders are still in place. Remove it when the site is ready for search engines.
