# MI Practice tool — deploy guide (OpenAI version)

This is a self-contained MI practice tool. A learner picks a prepared client or builds one to match their caseload, has a typed session, can tap **Pause to coach** for in-the-moment help, and gets an MITI-framed coding sheet at the end. It runs as a web page anyone can open with a link. No app store, no install.

Two files do the work:

- `index.html` — the whole tool (the page, the conversation, the feedback). This is also the file you edit to change scenarios.
- `api/chat.js` — a small server file that holds your secret OpenAI API key and relays messages to the model. Your key never touches the web page.

You pay OpenAI for usage, but for typed sessions this is pennies each. The steps below also show how to cap spending and keep the open internet from running up your bill.

---

## What you need (all free to set up)

1. A free **GitHub** account.
2. A free **Vercel** account (sign in with GitHub).
3. Your **OpenAI API key** from platform.openai.com, which you already have funded.

---

## Step 1 — Copy your key and set a spending cap

1. Go to platform.openai.com and sign in.
2. Open the billing or limits settings and set a **monthly usage limit** plus an email alert. This is your safety net so the bill cannot exceed the cap.
3. Under API keys, copy an existing key or create a new one. You will paste it into Vercel in Step 3, never into a file.

## Step 2 — Put the files on GitHub

1. Create a new repository (private is fine).
2. Upload the folder, keeping the structure exactly: `index.html` at the top level, and `chat.js` inside a folder named `api`.

## Step 3 — Deploy on Vercel

1. Go to vercel.com and sign in with GitHub.
2. Add a new project and import the repository.
3. Before deploying, open **Environment Variables** and add:
   - `OPENAI_API_KEY` set to the key you copied in Step 1.
   - Optional but recommended: `ACCESS_CODE` set to any short code you choose. With it set, the tool asks for the code before it runs, which stops strangers from using your key.
4. Deploy. After a minute Vercel gives you a public link like `your-tool.vercel.app`.

## Step 4 — Test it

Open the link. If you set an access code, it prompts once. Pick a prepared client or try Build my own client, have a few exchanges, and end the session to confirm the coding sheet renders. If it errors, the usual causes are a missing or mistyped `OPENAI_API_KEY`, or a usage limit set to zero.

## Step 5 — Get it to learners

Put the link in your Canvas course for students, which keeps it to enrolled people. For CEU or workshop groups, share the link and the access code in your materials, and avoid posting the raw link on a fully public page. Each new tool you make gets its own link, and they all gather behind your Craft hub.

---

## Cost, in plain terms

The tool defaults to the GPT-4.1 family: `gpt-4.1-mini` for the conversation and coaching, and `gpt-4.1` for the coding sheet. These use simple billing and do not generate hidden reasoning tokens, so cost stays low and predictable, a few pennies per full session. Your monthly cap from Step 1 makes the worst case impossible.

If you want more nuance later, open `index.html` and change `CLIENT_MODEL` to `gpt-5.4-mini` and `CODER_MODEL` to `gpt-5.4`. The server file already handles the parameter differences for the GPT-5 family, so no other change is needed.

---

## What learners see

The tool opens on a home screen with three choices: two prepared clients (Dani, an ambivalent drinker, and Cheryl, newly diagnosed with diabetes), and a **Build my own client** option. The build option asks a few quick questions about the learner's setting and the kind of client they want, then generates a fitting fictional client and drops them into a session. The coach and the coding sheet work the same no matter which client is chosen.

## Editing or adding prepared clients

The two prepared clients live near the top of `index.html` in a list called `CORE`. Each has a `tag`, a `name`, a `card` (the on-screen description), a `target` (the change target shown on screen), and a `system` (the full persona the role-player follows). To change a client, edit its `system`. To add a third, copy one of the existing blocks and edit it.

To shape how the generated clients come out, edit the `GENERATOR_SYSTEM` block. Its first and most important rule is that every generated client must have one clear, preferably behavioral change target, since MI only works with a concrete target. If a learner enters a vague concern, the generator narrows it into a specific behavior. The change target is shown on screen so the MI focus is always explicit.

## Adding voice later

This version is typed on purpose, to keep cost low and deployment simple. When you want spoken practice, the cleanest path is to let a hosted voice agent run the live conversation using the same persona text, capture the transcript it produces, and send that transcript to this same coder to render the same coding sheet. The feedback layer does not change.
