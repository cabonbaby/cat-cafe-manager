# Cat Cafe Manager Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a browser-playable cat café management game with a cozy interface, resource loop, customer orders, upgrades, and enough polish to demo immediately.

**Architecture:** Use a lightweight static web app with three files: `index.html`, `styles.css`, and `app.js`. Keep all game state client-side in JavaScript, render UI via DOM updates, and use a timer-driven day loop with click actions, random cat customers, upgrades, and win/lose-style pressure through reputation and supplies.

**Tech Stack:** Plain HTML, CSS, and vanilla JavaScript; served locally with `python3 -m http.server`; quick tunnel support scaffolded via `hermes-demo-kit`.

---

### Task 1: Create the static project shell
- Create the project under `/home/suker/projects/cat-cafe-manager`
- Add `index.html`, `styles.css`, `app.js`, and `README.txt`
- Keep the first version dependency-free for a fast demo

### Task 2: Implement the core loop
- Resources: coins, beans, milk, fish, catnip, reputation, day, energy
- Actions: brew coffee, bake fish bun, pet resident cats, restock supplies
- Customers arrive on a timer and request items with rewards/penalties

### Task 3: Add upgrades and strategy
- Hire helper cat, grinder upgrade, pastry oven, cozy décor
- Upgrades improve output, patience, or income scaling
- Keep simple but replayable progression

### Task 4: Polish the interface
- Cozy visual theme
- Status cards, action buttons, order queue, event log, progress/win condition
- Mobile-friendly enough for a phone demo

### Task 5: Make it demo-ready
- Add README and DEMO setup
- Scaffold local service and temporary Cloudflare tunnel support
- Start local server and verify gameplay in browser
