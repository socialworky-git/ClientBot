# MI Practice tool — deploy guide

This is a self-contained MI practice tool: a learner has a typed session with Dani, can tap **Pause to coach** for in-the-moment help, and gets an MITI-framed coding sheet at the end. It runs as a web page anyone can open with a link. No app store, no install.

There are only two files that do the work:

- `index.html` — the whole tool (the page, the conversation, the feedback). This is also the file you edit to create new scenarios.
- `api/chat.js` — a tiny server file that holds your secret API key and passes messages to the model. Your key never touches the web page.

You will pay the model provider for usage, but for typed sessions this is pennies each. The steps below also show you how to cap your spending and keep the open internet from running up your bill.

---

## What you need (all free to set up)

1. A free **GitHub** account (you already use GitHub Pages, so you have this).
2. A free **Vercel** account, which you can create by signing in with GitHub.
3. An **Anthropic API key** from the Claude developer console.

---

## Step 1 — Get an API key and set a spending cap

1. Go to the Claude developer console at https://console.anthropic.com and sign in.
2. Add a small amount of credit (you control how much).
3. Find the usage or billing limits setting and set a **monthly spend cap** plus an email alert. This is your safety net. Even if something goes wrong, your bill cannot exceed the cap.
4. Create an API key and copy it somewhere safe. You will paste it into Vercel in Step 3, not into any file.

## Step 2 — Put the files on GitHub

1. Create a new repository on GitHub (private is fine).
2. Upload this whole folder, keeping the structure exactly: `index.html` at the top, and `chat.js` inside a folder named `api`.

## Step 3 — Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub.
2. Click **Add New Project** and import the repository you just created.
3. Before deploying, open **Environment Variables** and add:
   - Name `ANTHROPIC_API_KEY`, value = the key you copied in Step 1.
   - Optional but recommended: Name `ACCESS_CODE`, value = any short code you choose (for example a word plus a number). If you set this, the tool will ask for the code before it works, which stops strangers from using your key.
4. Click **Deploy**. After a minute Vercel gives you a public link like `your-tool.vercel.app`.

That link is your tool. Open it, have a quick session, and end it to confirm the feedback renders.

## Step 4 — Get it to your learners

Share the Vercel link, plus the access code if you set one. Two good ways:

- **Students:** put the link inside your Canvas course. Only enrolled people see it, which gives you a built-in gate.
- **CEU / workshop groups:** share the link and the access code in your materials. Avoid posting the raw link on a fully public web page so it does not get crawled and used by strangers.

---

## Cost, in plain terms

A full typed session plus the feedback is a few pennies at most on the default model (`claude-sonnet-4-6`). A cohort of a hundred learners doing a couple of sessions each lands in the low single digits to low tens of dollars, not hundreds. Your monthly cap from Step 1 makes the worst case impossible to exceed.

If you want to trim cost further, open `index.html`, find the line near the top that reads `CLIENT_MODEL = "claude-sonnet-4-6"`, and change it to `claude-haiku-4-5-20251001`. Haiku is cheaper and faster, and is plenty for the client conversation. Leave `CODER_MODEL` on Sonnet, since the MITI coding benefits from the stronger judgment.

---

## What learners see

The tool opens on a home screen with three choices: two prepared clients (Dani, an ambivalent drinker, and Cheryl, newly diagnosed with diabetes), and a **Build my own client** option. The build option asks a few quick questions about the learner's setting and the kind of client they want, then generates a fitting fictional client on the spot and drops them straight into a session. The coach and the coding sheet work the same no matter which client is chosen.

## Editing or adding prepared clients

The two prepared clients live near the top of `index.html` in a list called `CORE`. Each one has a `tag`, a `name`, a `card` (the description shown on screen), and a `system` (the full persona the role-player follows). To change a client, edit its `system` text. To add a third prepared client, copy one of the existing blocks and edit it. To shape how the generated clients come out, edit the `GENERATOR_SYSTEM` block. Its first and most important rule is that every generated client must have one clear, preferably behavioral change target, since MI only works with a concrete target. If a learner enters a vague concern, the generator narrows it into a specific behavior. Each prepared client also carries a `target` field, and the change target is shown on screen so the MI focus is always explicit.

You can keep several versions in separate repos, each with its own link, and gather the links in your Craft hub so learners see one organized front door.

## Adding voice later

This version is typed on purpose, to keep cost low and deployment simple. When you want spoken practice, the cleanest path is to let a hosted voice agent (ElevenLabs or Vapi) run the live conversation using the same Dani persona text, capture the transcript it produces, and send that transcript to this same coder to render the same coding sheet. The feedback layer you have here does not change.
