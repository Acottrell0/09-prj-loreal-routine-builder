# Project 9: L'Oréal Routine Builder
L’Oréal is expanding what’s possible with AI, and now your chatbot is getting smarter. This week, you’ll upgrade it into a product-aware routine builder. 

Users will be able to browse real L’Oréal brand products, select the ones they want, and generate a personalized routine using AI. They can also ask follow-up questions about their routine—just like chatting with a real advisor.

## Worker setup

The browser sends the full `messages` conversation to a class-hosted Cloudflare
Worker. Set the deployed Worker URL in `WORKER_URL` at the top of
[`script.js`](script.js). Keep the OpenAI API key in the Worker secret store;
never add it to this repository or to browser JavaScript.

The Worker should accept a `POST` body shaped like:

```json
{
  "messages": [
    { "role": "user", "content": "Build my routine..." }
  ]
}
```

and return the usual chat completion shape:

```json
{
  "choices": [
    { "message": { "content": "Your routine..." } }
  ]
}
```

## Included features

- Product search and category filtering work together.
- Selected products are saved in `localStorage` and can be removed individually or cleared.
- Clicking a product card toggles it in the selected list.
- Product descriptions expand from each card.
- The Arabic RTL toggle updates the page direction and language.
- Follow-up requests send the full `messages` conversation to the Worker.

For the LevelUp web-search extra credit, configure the class-hosted Worker to
use an OpenAI model or tool with web-search support and return any citations
in the chat completion response. The browser remains credential-free.