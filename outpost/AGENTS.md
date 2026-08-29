# Project agent rules

- This project runs natively on Windows.
- Shell commands execute in Windows PowerShell. Do not use `&&` as a command separator.
- For browser-facing functionality, use the Playwright MCP tools to verify the application in an actual browser.
- Do not declare UI, canvas, input, rendering, or gameplay issues fixed solely because TypeScript, build, lint, or unit tests pass.
- For browser bugs, verify the observed behavior after making changes.
- Check browser console/runtime errors when diagnosing frontend failures.
- Keep changes focused and run relevant automated tests after fixes.
