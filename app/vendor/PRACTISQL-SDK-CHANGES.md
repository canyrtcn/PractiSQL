# Local SDK adaptations

The bundled Sign in with ChatGPT DevKit retains its original noncommercial license and third-party notices. These adaptations do not relicense it.

- Native requests use Electron `net.fetch`, keeping the platform trust store and proxy behavior. TLS and OAuth validation are not bypassed.
- The Responses integration accepts function-call continuation items and retains output and usage metadata for the local application tools.
- On 2026-10-18, the stream reader was updated to retain completed `response.output_item.done` items when the terminal response contains an empty output array. Item order and encrypted reasoning content are retained. Text deltas remain unchanged; complete output text is used only when no text delta was received. Incomplete and failed streams remain errors.

The last change was reproduced on the pre-change application and validated with synthetic streaming fixtures and a live GPT-6 Luna conversation. Request instructions, tool schemas, SQL semantics, and model permissions were not changed.
