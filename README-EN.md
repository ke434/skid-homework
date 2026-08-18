# Skid-Homework｜A New Paradigm for Efficient Learning

Visit: **http://111.229.11.169:3000**

[中文 README](/README.md)

> Rebuild the learning workflow with technology — a lightweight AI-powered cloud platform for homework and mistake management, where every practice becomes a stepping stone for growth.

## About

Skid-Homework is an open-source, AI-powered learning workbench for students and self-learners. No heavy clients — it runs entirely in the browser with zero installation. Sign up and get a one-stop cloud experience covering homework solving, mistake archiving and knowledge review, with mistakes, exercises and solution approaches collected in one place to build your personal digital learning knowledge base.

This is not a simple answer engine — it focuses on guiding your thinking. Through intelligent recognition and step-by-step analysis, it clarifies problem-solving logic and pinpoints knowledge gaps, replacing mindless copying and inefficient drilling with a complete learning loop: **spot the problem — analyze the cause — reinforce the knowledge**.

## Highlights

✅ **Multi-source intelligent recognition** — Drag & drop images/PDFs, OCR question recognition, quickly import exercises and mistakes without manual transcribing.

✅ **AI-powered deep reasoning** — Powered by large models, with multiple explanation styles: full standard steps or thought prompts and heuristic guidance for self-study, homework checking and mistake review — encouraging active thinking rather than copying answers.

✅ **Cloud mistake notebook** — Mistakes are stored in the cloud permanently, retrievable anytime for periodic review to pinpoint weak knowledge points.

✅ **Smooth, ergonomic UX** — Full shortcut system, dark mode, responsive layout; pure browser-based, no telemetry, protecting your learning data privacy.

✅ **Lightweight open architecture** — Simple, efficient and ready to use out of the box; focused on the essence of a learning tool, no bloat — computing power goes to actual learning.

## Who is it for

🎓 K-12 students: homework self-check, mistake organizing, discovering knowledge gaps
📖 Self-learners & exam candidates: drill and review, building a personal question bank
👨‍👩‍👧‍👦 Parents: help analyze questions and guide children to build problem-solving thinking

## Try it now

🌐 Visit: http://111.229.11.169:3000
Sign up and start your personal cloud mistake notebook.

> Leave repetition to tools, keep thinking to yourself. Skid-Homework — your cloud AI learning workbench.

## Shortcuts

> Note: if your browser already uses a shortcut, or you find the defaults awkward, you can remap them in the settings!

| Shortcut    | Description                              |
| ----------- | ---------------------------------------- |
| Ctrl+1      | Upload file                              |
| Ctrl+2      | Take a photo                             |
| Ctrl+3      | Submit file to AI                        |
| Ctrl+4      | Delete all files                         |
| Ctrl+5      | Open settings page                       |
| Ctrl+X      | Open Global Traits Editor                |
| ESC         | Close settings page / current dialog box |
| Space       | Next problem                             |
| Shift+Space | Previous problem                         |
| Tab         | Next file                                |
| Shift+Tab   | Previous file                            |
| /           | Improve solution                         |

## FAQ

### Charting tool support

> Note: some AIs occasionally emit wrong tool calls; please report any issues.

- [JSXGraph](https://github.com/jsxgraph/jsxgraph) (unstable)
- [Mermaid](https://mermaid.js.org/)
- [function-plot](https://github.com/mauriciopoppe/function-plot) (being phased out, will be replaced by JSXGraph)
- [SVG](https://www.w3.org/Graphics/SVG/)

### Why is it so slow

This software uses an LLM, not a question bank.

LLM responses usually take longer than a question bank.

There is no great way to optimize this.

You can try reducing the Thinking Budget, although too small a value may cause wrong answers.

If you don't need detailed explanations, try this prompt (paste it into the Ctrl+X editor):

```text
用中文输出答案
只需要输出答案即可，选择题不需要输出解析(留白即可)
```

### Why does it always fail

- Check whether the API allows CORS
- Check whether your IP is blocked by the provider
- Check whether the API key is valid
- Check the Devtools (F12) logs

### I don't have a camera on my computer, please help

We support ADB: connect an Android phone and capture its screen, if your browser supports WebUSB.

Everything happens locally; no privacy is collected.

On iPhone / postmarketOS, try [KDE Connect](https://kdeconnect.kde.org/).

### I don't like the answer style / it doesn't match my expectation

This site ships without a default answer style — it is less turn-key than traditional question banks, but far more customizable.

Click `Edit Global Prompt` (Ctrl+X) to edit the prompt and add your own requirements, such as an answer style.

If you are unhappy with one particular answer, press `/` (Improve solution) to ask the AI to rewrite it.

### I don't have an API key

A Gemini API key is free — just apply for one.

If your environment doesn't allow it, you can set up a reverse proxy with Cloudflare; look up the method yourself.

### Request failure

If your API key and endpoint are correct, it's most likely CORS.

That's a browser limitation — try running a local reverse proxy.

For anything else, open an issue with the Devtools (F12) logs.

### How is OCR implemented

The site currently sends images directly to the AI.

If you have a better approach, open a PR or issue.

### What makes this better than traditional apps (e.g. Zuoyebang)

- Works on desktop
- Ergonomics designed for homework scenarios
- Charting support
- Open source, no ads

### I still prefer other answer-finding apps

Then keep using the tool you like — tools serve people; use what feels right.

### What is Dev mode

We included some features in the software for debugging purposes.

Please don't enable it unless you have a problem.

Features:

- View raw Markdown

### Other questions

> Found a bug? Report it at [issues](https://github.com/ke434/skid-homework/issues); otherwise head to the discussions.

Please visit [Discussions](https://github.com/ke434/skid-homework/discussions)

## Community

- [GitHub Issues](https://github.com/ke434/skid-homework/issues) (report bugs, request features)
- [GitHub Discussions](https://github.com/ke434/skid-homework/discussions)

## Security Notice

This platform never asks you to install desktop software — everything runs in your browser.

If any site asks you to download software to use this platform, it is likely malware.

There is only one address and one repository:

- Website: [http://111.229.11.169:3000](http://111.229.11.169:3000)
- Repository: [https://github.com/ke434/skid-homework](https://github.com/ke434/skid-homework)

## Development

- Clone this repository
- Run `pnpm i`
- Run `pnpm run dev` to preview

PRs are welcome.

### Quick deploy using Vercel

Please click the button below

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fke434%2Fskid-homework)

### Build and run with Docker

The container exposes port `3000`.

```shell
docker build -t skid-homework .
docker run -p 3000:3000 skid-homework
```

Here's the Docker Compose manifest

```yaml
services:
  skidhw:
    build: .
    ports:
      - 3000:3000
```

### I18N type errors

After editing i18n files, run the following to regenerate types:

```shell
pnpx i18next-cli types
```

## License

This work is licensed under GPL-3.0

You're allowed to use, share and modify.
