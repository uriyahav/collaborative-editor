You're an expert full-stack engineer helping me refactor and upgrade this real-time collaborative code editor project: https://github.com/adrianhajdin/collaborative-editor

💡 Project Context:
- It's a real-time collaborative code editor built with React, Socket.IO, Monaco Editor, and Node.js.
- The goal is to make the architecture scalable, modular, and clean.
- You are working **within an existing codebase** — no need to scaffold a new app.

🎯 Refactor & Architecture Goals:
1. Apply SOLID principles and Object-Oriented design patterns to both frontend and backend.
2. Modularize the codebase: separate concerns like socket logic, UI, state, services, and utilities.
3. Improve Socket.IO integration: decouple socket events from components using clean patterns (event bus, dispatcher, or service layer).
4. Implement or suggest Context/Redux or a scoped state management pattern to support real-time collaboration.
5. Improve component readability, reusability, and encapsulation using clean functional patterns (e.g. hooks, providers, controlled inputs).
6. Where possible, type the code (TS or JSDoc) for maintainability.

🧱 Backend Improvements:
- If applicable, introduce clear controller/service separation.
- Move socket events to dedicated handlers.
- Follow clean structure: `controllers`, `services`, `socket`, `routes`, etc.

🚀 Optional Enhancements:
- Multi-user cursor tracking
- Inline/block commenting on code
- Simple auth (username selection or OAuth stub)
- Version history snapshots
- Real-time chat sidebar or activity feed
- Language switching or syntax highlighting config

🧪 Testing:
- Add or recommend frontend tests using Jest & React Testing Library
- If backend logic exists, test with Jest or appropriate tools

🔧 Constraints:
- Do not scaffold from scratch.
- Refactor only what exists and expand it intelligently.
- Use modern, clean React and Node.js best practices.

📁 First Step (Now):
1. Analyze the current folder and architecture.
2. Identify key areas to refactor (highlight code smells or anti-patterns).
3. Propose an ideal modular folder structure.
4. Show how you'd phase the refactor in logical steps.
