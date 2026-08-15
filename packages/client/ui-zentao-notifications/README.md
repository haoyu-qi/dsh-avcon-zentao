# @deepseek-ai/dsh-client-ui-zentao-notifications

English | [中文](README.zh.md)

Browser ZenTao personal-work plugin. It registers an additive `shell.overlay` entry whose trigger starts inside the conversation field below the top application controls. The trigger can be dragged within the conversation field; a click still opens the panel, and the panel changes its horizontal and vertical alignment to stay visible beside the trigger. Its ZenTao icon carries a text-backed status indicator for disconnected, connecting or retrieving, connected, and connection-error states. The panel accepts a server URL, personal account, and password, then uses the generic Connection RPC channel to request login and retrieve the account's assigned tasks and Bugs from the Host gateway.

After login, the component keeps the returned profile and task/Bug snapshot for its lifetime. The user can switch between task and Bug lists, refresh immediately, or select a 1, 5, 15, or 30 minute polling interval. The optional **Remember server and account** control restores those two fields from browser-local storage on the next visit. The password is cleared from React state after a successful login and is never written to browser storage. Escape or an outside pointer gesture closes the panel.

Task and Bug cards are draggable and expose an **Open original page** link. Dropping one on the conversation composer inserts a compact, editable Markdown reference at the current selection. The linked title carries the item number, title, and original ZenTao URL, followed by its status, priority, deadline/update date, and an instruction to use the ZenTao CLI to retrieve the latest details and context before handling it.

## Model Experience

None, as dragging creates ordinary composer draft text whose existing conversation path controls model visibility and session logging only after submission.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Process-lifetime login state** — restarting the Host requires login through the panel again; the optional browser preference restores only the server and account fields, while the official CLI independently owns its Token.
- **Bounded retrieval** — each refresh displays at most 100 assigned tasks and 100 assigned Bugs; Bug discovery covers the first 100 accessible products.
- **Read-only ZenTao projection** — the panel can list and reference personal tasks and Bugs in a conversation, but cannot edit, resolve, or close them in ZenTao.
