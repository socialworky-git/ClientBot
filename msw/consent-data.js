/* Shared data for the Informed Consent tools.
   Loaded by /msw/consent-script/ and /msw/informed-consent/.
   Edit prompts here so both pages stay in sync. */
window.SW_CONSENT = {
  KEY: 'sw-consent-script-v1',
  SCRIPT_URL: '/msw/consent-script/',
  CARDS_URL: '/msw/informed-consent/',
  PROMPTS: [
    {
      q: "What is therapy?",
      starters: [
        "Therapy is a place where…",
        "My job as a therapist is to…",
        "People come to therapy for all kinds of reasons, like…"
      ],
      ph: "Therapy is a place where…"
    },
    {
      q: "What can I expect?",
      starters: [
        "Sometimes therapy can feel…",
        "We’ll probably start by…",
        "It’s normal for people to feel…",
        "It can take time, but many people find…"
      ],
      ph: "We’ll probably start by…"
    },
    {
      q: "What if I don’t feel comfortable working with you?",
      starters: [
        "It’s really important you feel safe with me…",
        "If it ever feels like I’m not the right fit for you…",
        "You always have the option to…"
      ],
      ph: "It’s really important you feel safe with me…"
    },
    {
      q: "Will our talks stay private?",
      starters: [
        "Most of what we talk about stays private…",
        "There are a few times I might have to share…",
        "If I ever needed to share something, I’d…"
      ],
      ph: "Most of what we talk about stays private…"
    },
    {
      q: "How long do I have to keep coming?",
      starters: [
        "This is your choice…",
        "You’re never required to…",
        "You can decide at any point…"
      ],
      ph: "This is your choice…"
    }
  ]
};
