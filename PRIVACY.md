# Privacy notice

**This is a general-purpose template, not legal advice.** Privacy obligations depend on your role (developer vs. host vs. employer), your users, and laws such as the GDPR, CCPA, and others. Consult a privacy lawyer for a production service.

---

## Who this applies to

This repository describes software you may **self-host** or **deploy**. **You** (the deployer or operator) are typically responsible for your users’ data and for posting your own privacy policy where required.

## Data the Software may process

Depending on configuration, the Software may involve:

| Data | Typical handling |
|------|------------------|
| **Tasks, schedules, completion logs** | Stored in your database (e.g., SQLite/Postgres) under your control. |
| **OpenAI API key (server)** | In environment variables on your server if you set `OPENAI_API_KEY`. |
| **OpenAI API key (BYOK)** | May be stored in the **end user’s browser** (e.g., local storage) and sent to **your** backend over HTTPS when AI features run; not intended to be persisted by this app on the server. |
| **Prompts and AI payloads** | Sent to **OpenAI** (or another provider if you change the code) when AI features are used. Subject to that provider’s privacy policy and retention. |
| **Voice** | Speech may be processed by the **browser’s** speech recognition; check the browser/OS vendor. Transcripts may be sent to your server and onward to OpenAI. |

## Third parties

- **OpenAI** (or other LLM providers you configure): [OpenAI’s privacy policy](https://openai.com/policies/privacy-policy) applies to API usage.
- **Hosting, DNS, TLS**: Your cloud provider’s terms apply.

## No analytics by default

This repository does not require embedded third-party analytics; any analytics would come from **your** deployment choices.

## Security

No system is perfectly secure. You are responsible for patches, HTTPS, secrets management, access control, and backups.

## Children

The Software is not directed at children. Do not use it in ways that violate child-privacy laws (e.g., COPPA) without proper compliance.

## Changes

Operators should update their own privacy policy when practices change.

---

For liability limits, see [`DISCLAIMER.md`](DISCLAIMER.md). For usage rules, see [`TERMS_OF_USE.md`](TERMS_OF_USE.md).
