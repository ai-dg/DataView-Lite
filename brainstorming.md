You are an expert AI coding assistant architect.

Your task is to generate a complete `.claude` configuration for a 2-hour technical test project.

I will provide the assignment PDF as a source file inside the project. You must read and analyze the PDF from the project files before generating anything.

Your output must be downloadable `.md` files, not only text displayed in the ChatGPT conversation.

---

## Goal

Create a minimal but high-impact project setup optimized for:
- Speed: 2 hours max
- Clarity
- Product thinking
- UX simplicity
- Demo readiness

This is NOT a production system.

---

## Required output

Generate a ready-to-download `.claude` folder containing these files:

### `.claude/CLAUDE.md`
Main entry file for Claude Code / Cursor.

It must include:
- Project mission
- Global rules
- Coding philosophy
- Priority order
- How Claude should use the other `.md` files
- Strong warning against over-engineering
- Reminder that the PDF assignment is the source of truth

### `.claude/project.md`
Include:
- Summary of the assignment
- Real expectations behind the test
- Key success criteria
- What matters vs what does not

### `.claude/architecture.md`
Include:
- Minimal stack
- File structure
- Core components
- Data flow
- Simplified schema introspection strategy

### `.claude/ux.md`
Include:
- UI structure, max 3 screens
- Navigation flow
- UX principles for non-technical users
- Humanized labels strategy
- Anti-jargon rules

### `.claude/llm.md`
Include:
- Natural language → SQL strategy
- Prompt strategy
- Fallback for unclear queries
- Mock vs real implementation options

### `.claude/constraints.md`
Include:
- No over-engineering
- No hardcoded schema
- Generic behaviour only
- Allowed shortcuts
- What can be safely mocked

### `.claude/demo.md`
Include:
- How to present the project
- Key talking points
- Trade-offs
- What to say if something is incomplete

---

## Important instructions

- First read the assignment PDF from the project source files.
- Treat the PDF as the source of truth.
- Generate actual downloadable `.md` files.
- Do not only paste the files in the chat.
- Keep every file concise and actionable.
- Avoid enterprise architecture.
- Optimize for building fast.
- Focus on perceived value and demo clarity.
- Do not generate production-heavy documentation.
- Do not over-engineer.

---

## Mindset

Think like:
- a startup CTO
- a product designer
- a senior full-stack engineer
- an interviewer evaluating reasoning under time pressure

---

## Expected result

A downloadable `.claude` folder with all `.md` files ready to place inside the project.

Do not explain the reasoning. Generate the files.


## UI Constraint (VERY IMPORTANT) 

The application MUST be implemented as a single-page interface. 
Do NOT create multiple pages or routes. 

All features must be integrated into ONE unified screen: - Sidebar for tables 
- Main area for data visualization 
- Search bar 
- LLM assistant 
Reason: 
- Optimize for speed (2-hour constraint) 
- Reduce complexity 
- Improve UX for non-technical users 

Avoid: 
- routing 
- page transitions 
- multi-page architecture 

## Reasoning and language preference 

When planning or analysing the problem internally, you may reason in Chinese if it helps improve precision and structure. 

However: 
- All generated `.md` files must be written in French. 
- All user-facing documentation must be in French. 

- Code, variable names, function names, comments, and README technical commands should remain in English when appropriate. - Do not include Chinese text in the final files. 

## Language rules 

Use French for all project guidance and documentation. 

Use English for: 
- code identifiers 
- filenames 
- technical library names 
- terminal commands 
- API names 

You may reason internally in Chinese if useful, but the generated `.md` files must be fully in French.
