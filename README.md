# Socialworky practice tools — platform guide

This is now a small platform, not a single page. A hub page lists your tools, and each tool lives in its own folder but shares one backend and one OpenAI key. Adding a new tool later is just a new folder plus a card on the hub.

## Structure

```
index.html              <- the hub (lists and links to every tool)
clientbot/index.html    <- the ClientBot tool (MI practice + coaching + feedback)
api/chat.js             <- ONE shared backend that holds your OpenAI key
README.md               <- this guide
```

The backend lives at `/api/chat` for the whole site, so every tool can call it. You set the key once and all tools share it.

## Deploy (same as before)

1. Put these files in your GitHub repo, keeping the folders exactly as shown.
2. In Vercel, set environment variables: `OPENAI_API_KEY` (required) and optionally `ACCESS_CODE` (a short code learners must enter, which protects your bill). Redeploy after any change to these.
3. Visit your site. The hub appears at the root, and ClientBot at `/clientbot/`.

## Set your research email (do this before sharing)

ClientBot can email a learner's session to you when they opt in. Open `clientbot/index.html`, find the line near the top:

```
const RESEARCH_EMAIL="you@example.com";
```

Replace it with the address where submissions should arrive. Also edit the consent sentence on the feedback screen (search for "Replace this sentence") so it matches your own IRB-approved language. Submissions are voluntary, gated behind a consent checkbox, and arrive as a pre-filled email the learner sends from their own mail app.

## What learners can do with their work

Because there are no accounts, two options let learners keep or share their work:

- Save as PDF: on both the session and the feedback screen, this opens the browser print dialog. Choosing "Save as PDF" produces a clean document with the client, the change target, the full transcript, and the coding sheet.
- Email to researcher: on the feedback screen, after checking the consent box, this opens a pre-filled email to you containing the transcript and a short summary. Note that a few email apps shorten very long messages, so the PDF is the complete record.

## Adding a new tool later

1. Make a new folder, for example `sbirt/`, with its own `index.html`. The quickest start is to copy `clientbot/index.html` and rewrite the personas and labels.
2. It can call the same backend at `/api/chat`, so you do not set up the key again.
3. On the hub (`index.html`), copy the commented tool block and point it at the new folder.

## Editing clients and the generator (ClientBot)

Prepared clients live near the top of `clientbot/index.html` in the `CORE` list, each with a `tag`, `name`, `card`, `target`, and `system`. Edit a `system` to change a client, or copy a block to add one. The `GENERATOR_SYSTEM` block controls the build-your-own feature; its first rule is that every generated client must have a clear, preferably behavioral change target.

## Cost, access, and privacy

The only running cost is OpenAI usage, a few pennies per typed session; set a monthly cap on your OpenAI account. The `ACCESS_CODE` plus linking from Canvas keeps strangers off your key. Nothing is stored on a server: sessions live only in the browser and disappear on refresh, which is friendly for FERPA and clinical ethics. Tell learners to use only fictional or composite details, never real client information, since their text is sent to OpenAI to generate replies.

## Embedding in your site

For phones especially, a full-page link to a tool feels better than an iframe, which forces an awkward inner scroll. If you do embed, size the iframe to fill the screen rather than a fixed height. The pages themselves are now responsive and adjust to phones, tablets, and desktops.

## A note on hosting terms

Vercel's free Hobby plan is for personal, non-commercial use. As this grows or is embedded in your professional site, the clean options are Vercel's Pro plan or a host without that restriction, such as Cloudflare Pages.
