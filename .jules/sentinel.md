## 2026-08-04 - [Weak PRNG for Authentication Tokens]
**Vulnerability:** The application used `Math.random()` to generate nonces for check-in QR codes.
**Learning:** `Math.random()` is not cryptographically secure and its outputs can be predicted, allowing an attacker to potentially forge or replay QR tokens.
**Prevention:** Always use `window.crypto.randomUUID()` or `window.crypto.getRandomValues()` for generating security tokens, nonces, or any values requiring unpredictability in the browser environment.
