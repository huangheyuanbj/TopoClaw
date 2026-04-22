<h1 align="center">TopoClaw: Your AI Digital Assistant — Hands-on, Collaborative, Proactive</h1>

<p align="center">
  <a href="#-what-is-topoclaw">About</a> •
  <a href="#-core-capabilities">Core Capabilities</a> •
  <a href="#-security">Security</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#️-roadmap">Roadmap</a> •
  <a href="#-faq">FAQ</a>
</p>

<p align="center">
  <a href="./README.md"><strong>English</strong></a> | <a href="./README_CN.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Android-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/python-3.12%2B-brightgreen" alt="Python" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
</p>

---

## 💡 What is TopoClaw?

TopoClaw is your **AI digital assistant**. It's not just a chatbot — it's an assistant that can **operate your computer and phone, communicate and collaborate with others on your behalf, and proactively keep things moving when you're away**, continuously learning your preferences to become more like you over time.

This repository combines **`TopoMobile`** (mobile) and **`TopoDesktop`** (desktop) products together. You can use the default assistants directly, or create your own assistants and skills to accomplish complex tasks across devices and users.

Your assistant has these core capabilities:

- **🖥️📱 Cross-Device Execution**: Phone and computer form a unified execution surface — tasks can be decomposed, parallelized, and chained across devices, with outputs flowing automatically between steps
- **👥 Social Collaboration**: TopoClaw has a shareable social identity, can be invited into group chats to negotiate and get things done, can auto-create multi-user multi-assistant groups for collaborative problem-solving, and can help filter and reply to group and friend messages for you — while key decisions remain in your control
- **⚡ Proactively sense & drive**: Senses phone notifications, detects schedule conflicts, and proactively reports key conclusions — no need for you to keep asking
- **🔒 Security by design**: Three-tier file permissions + workspace isolation + command auditing — powerful but never out of control
- **🧩 Open and extensible**: Skill community + assistant marketplace + multi-channel access — capabilities are reusable, shareable, and customizable

---

## 📢 News

- **[22 Apr 2026]** TopoClaw is now open source — core Agent framework, desktop client, mobile client, and communication backend released

---

## 🎬 Demo

### ▶️ Cross-Device Execution
> "There's a PDF called 'Labor Contract' on my computer — find the name and phone number of Party A, then send a text message asking when they're available."

https://github.com/user-attachments/assets/1b1e3eaf-ae8a-4783-b381-94c61fb26e8f

### ▶️ Social Collaboration
> "Create a group called 'Team Hangout', invite my friend B, then ask if they're free for dinner sometime soon."

https://github.com/user-attachments/assets/d52cb686-db52-430d-9132-8272c3e0b98b

### ▶️ Proactive
> Receives a WeChat message and reacts: "Add an event to my phone calendar — dinner with classmates tonight at 7 PM, and set an alarm for 6:30 PM. Once done, reply on WeChat to confirm."

https://github.com/user-attachments/assets/7518751e-4731-405e-9157-7f0e4b35f930

> 🎥 The acceleration, trimming, and voiceover of the demo video were all done by TopoClaw itself.

---

## 🏆 Capability Comparison

<table>
  <thead>
    <tr>
      <th rowspan="2"></th>
      <th colspan="5" align="center">Cross-Device Execution</th>
      <th colspan="2" align="center">Social Collaboration</th>
      <th colspan="1" align="center">Proactive Sensing</th>
    </tr>
    <tr>
      <th>Mobile-use GUI</th>
      <th>Mobile DeepLink</th>
      <th>PC-Side Execution<br/>(Code &amp; Function Calling)</th>
      <th>Computer-use GUI</th>
      <th>Cross-Device<br/>Orchestration</th>
      <th>Digital Assistant</th>
      <th>Multi-User Multi-Agent<br/>Collaboration</th>
      <th>External<br/>Sensing</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>OpenClaw</strong></td><td>❌</td><td>❌</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td></tr>
    <tr><td><strong>TopoClaw</strong></td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
  </tbody>
</table>

---

## ✨ Core Capabilities

To act like you, your digital assistant needs three key abilities: **hands-on across devices**, **socialize & collaborate for you**, and **proactively sense & drive**.

### 🖥️📱 Cross-Device Execution

You use both your computer and phone — so does your assistant. Under the same account, phone and computer form a **unified execution surface**, with sessions and results extending seamlessly across devices.

- **Operates both PC and phone**: Invokes PC-side capabilities (Shell / Browser-use GUI / Computer-use GUI, etc.) and mobile-side capabilities (Mobile-use GUI / DeepLink, etc.) based on scenario
- **Tasks orchestrated across devices**: Supports task orchestration, parallel sub-tasks, and chained execution — output from one step auto-feeds the next, regardless of device
- **Results auto-consolidated**: PC file system serves as the data hub; mobile results sync back seamlessly

### 👥 Social Collaboration

You need to deal with other people — so does your assistant. It can create groups, negotiate, and get things done on your behalf. In group and assistant marketplace scenarios, multiple users and assistants collaborate through admin-organized coordination, free-form discussion, and workflow orchestration, bringing real-world multi-person workflows into a unified space.

- **Your smartest AI secretary**: Continuously learns your preferences and habits, represents you to create groups, negotiate, and get things done — handles daily affairs as if it were you
- **Knows where to draw the line**: Tiered handling — routine inquiries → auto-filtered scheduling → authorization required for key decisions → sensitive matters handed off to you
- **From group creation to getting it done**: Supports auto group creation, seamless negotiation → execution, and proactive post-execution reporting — each role plays its part, workflows unfold naturally

### ⚡ Proactively Sense & Drive

When you're away, your assistant keeps watch — handling what it can and alerting you when needed. Within rules and security boundaries, it **proactively senses** task progress and external changes, advancing next steps.

- **Never misses what matters**: Filters important phone notifications, cross-references with memory context (e.g., detects schedule conflicts)
- **Reports before you ask**: Key conclusions delivered proactively, pauses with context when decisions are needed, alerts on anomalies
- **Fewer round-trips**: Works with long-term memory, scheduled tasks, and channel notifications to reduce back-and-forth

> Specific capabilities depend on product version and configuration.

### 🧩 Supporting Capabilities

| Capability | Description |
|---|---|
| **Skills Ecosystem** | Search and install skills from the community, or have the assistant generate and save them on demand; once added to "My Skills," they're auto-invoked in matching scenarios |
| **Group Collaboration** | Create groups, invite friends and different assistants; supports task division, joint execution, and @-mentioning specific assistants |
| **Assistant Marketplace** | Create, manage, and share your own assistants, or add others' capabilities via assistant ID |
| **Memory Enhancement** | Continuously learns preferences and common workflows, reducing repetitive explanations |
| **Multi-Channel Access** | Connect to various IM channels, reusing the same assistant capabilities |

---

## 🔒 Security

Your assistant can execute code on your computer, control your phone's UI, and communicate on your behalf — with great power comes great risk. To address this, we designed a strict security architecture that fully unleashes assistant capabilities while ensuring every layer has a safety net:

| Layer | Mechanism |
|---|---|
| **Three-Tier Permissions** | Fine-grained file system access control with Forbidden / Read-only / Editable levels, enforcing the principle of least privilege |
| **Workspace Isolation** | Configurable allowed operation scope; out-of-bounds actions trigger a user confirmation prompt, auto-denied on timeout |
| **Command Execution Auditing** | All exec commands checked in real time; automatically intercepts dangerous operations like file moves and deletions, preventing agents from bypassing protections via generic tools |

---

## 🚀 Quick Start

### One-Click Install

- Third-party install notes (Issue, non-official): `<replace with issue link>`
- Third-party package (Release, non-official): <https://github.com/huanggangyyd/topoclaw-thirdparty-builds/releases/tag/v2.1.0-thirdparty.1>

#### Basic Setup

1. **Download and install**
   Download the mobile APK and desktop EXE, then complete installation on Android and Windows respectively.
2. **Deploy the relay service**
   Deploy `customer_service` from this repository for cross-device and cross-user message relay. After deployment, configure the service address in both apps:
   - Mobile app path: `Me -> Services -> scroll to the bottom and fill in "Manual Customer Service / Cross-device / Friend Chat Address"`
   - Desktop app path: `Enter any digits in IMEI input -> click Bind -> after the app opens, click Settings at the bottom-left -> fill in "Cross-device / Friend Chat Service Address"`
3. **Bind devices**
   Return to the desktop login page, tap Scan on the mobile app (top-right), then scan the desktop QR code to connect.
4. **Configure models**
   In TopoDesktop, open Assistant Plaza and edit TopoClaw model settings. There are two model categories:
   - `Chat`: for general tasks
   - `GUI`: for desktop/mobile GUI tasks (multimodal model)

After these steps, the basic setup is complete.

#### Additional Important Mobile Permissions

- **Accessibility and screenshot permissions**: Required for mobile GUI action simulation. You can grant them only when such tasks are actually needed.
- **Overlay permission**: After granting, enable "Allow overlay during tasks" and "Companion mode" (enabled by default). A floating ball appears on the desktop; tap it to launch tasks.
- **Device and app notification permissions**: Required for notification monitoring.

### 🛠️ Self-Hosting & Developer Guide

#### Developer Build / Run Commands

The following commands are for local development. Execute from the repository root by default.

##### Step 1 — TopoClaw (Core Agent Framework)

The core AI Agent engine handling dialogue understanding, task orchestration, tool orchestration, and multi-channel integration. All higher-level products depend on this framework.

```bash
cd TopoClaw
pip install -e .
topoclaw onboard
topoclaw service --host 0.0.0.0 --port 18790
```

##### Step 2 — GroupManager (Group Management Assistant)

A lightweight pure-LLM Q&A service for general chat and assistant management in group scenarios. Provides a streaming conversation interface via WebSocket.

```bash
cd GroupManager
pip install -r requirements.txt
python main.py --port 8320 --api-key sk-xxx
```

##### Step 3 — customer_service (Communication Backend)

The conversation relay and state management service responsible for binding, message routing, friend/group relationships, and multi-device sync — the bridge between mobile and desktop.

```bash
cd customer_service
pip install -r requirements.txt
python app.py
# Or with uvicorn
uvicorn app:app --host 0.0.0.0 --port 8001
```

##### Step 4 — TopoMobile (Android Client)

The mobile application providing chat interaction, task-execution GUI, trajectory collection & replay, notification sensing, and more — the AI assistant's execution entry point on your phone.

Open `TopoMobile/` in Android Studio, connect your phone, and Run (`Shift + F10`). See `TopoMobile/README.md` for details.

##### Step 5 — TopoDesktop (Desktop, Windows CMD)

The desktop client sharing chat history with the mobile side, supporting IMEI / QR-code binding. Ships with embedded TopoClaw and GroupManager backends, ready to use out of the box.

```cmd
cd TopoDesktop
build-desktop-core-plus-browser.cmd
```

This command runs the full desktop build pipeline in one shot (dependency install, built-in resource sync, embedded Python setup, browser-use install, and Electron packaging).
For more installation and packaging options, see `TopoDesktop/README.md`.

#### Reference Documentation

| Module | Description | Docs |
|---|---|---|
| **TopoClaw** | Core Agent framework | `TopoClaw/README.md` |
| **GroupManager** | Group management assistant | `GroupManager/README.md` |
| **customer_service** | Communication backend | `customer_service/README.md` |
| **TopoMobile** | Android client | `TopoMobile/README.md` |
| **TopoDesktop** | Desktop client | `TopoDesktop/README.md` |

---

## 🗺️ Roadmap

### ✅ Released

- **Cross-Device Execution**: Unified execution surface across phone and PC — task orchestration, parallel sub-tasks, and chained cross-device execution
- **Socialize & collaborate for you**: Digital assistant + group collaboration + assistant marketplace, with auto group creation and tiered behavior protocol
- **Proactively sense & drive**: Notification monitoring & smart judgment, proactive reporting, anomaly alerts
- **Skill system**: Skill creation, community installation, and auto-invocation loop
- **Security architecture**: Three-tier file permissions, workspace isolation, command execution auditing

### 📋 Planned

- Workflow flexibility enhancements
- Heterogeneous multi-device management
- More platform support (macOS / Linux desktop, iOS mobile)
- Team collaboration & permission management enhancements

---

## ❓ FAQ

**Q: Do I have to deploy all modules?**

**A:**
Not all of them. TopoClaw (the core Agent framework) runs on your PC and serves as the "brain" of the entire system — it must be deployed. Combine the remaining modules as needed:
1. **Desktop-only experience**: just TopoDesktop
2. **Cross-user collaboration**: TopoDesktop + customer_service
3. **Cross-device execution**: TopoDesktop + TopoMobile + customer_service

**Q: Which platforms are supported?**

**A:**
Currently the desktop client supports Windows only, and the mobile client supports Android only. macOS / Linux desktop and iOS mobile support are on the Roadmap — stay tuned.

**Q: Where is my data stored? Is it secure?**

**A:**
When using the local built-in environment, core data is processed locally first. The security architecture provides layered protection from data flow to operation permissions:
1. Some data from cross-device and social collaboration scenarios is relayed through the communication backend (customer_service), which can be self-hosted by the user
2. All other data is stored and processed locally
3. Any delete or write operation outside the designated workspace triggers a confirmation prompt — execution proceeds only after explicit user approval

For more security mechanisms, see the [Security](#-security) section.

**Q: Which LLMs does TopoClaw support?**

**A:**
Any model service compatible with the OpenAI API protocol (e.g., OpenRouter, DashScope, Azure OpenAI), plus OAuth login for OpenAI Codex and GitHub Copilot. See `TopoClaw/README.md` for configuration details.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  For feedback or suggestions, please submit an Issue or contact the maintainers.
</p>

<p align="center">
  <strong>TopoClaw 🐈 — Your AI digital assistant: hands-on, collaborative, proactive. The more you use it, the more it becomes you.</strong>
</p>
