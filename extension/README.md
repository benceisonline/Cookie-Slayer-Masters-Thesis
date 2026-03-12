# Cookie Slayer Masters Thesis
Update this at some point.

Installation (developer mode):

1. Open Chrome and go to `chrome://extensions/`.
2. Enable *Developer mode* (top-right).
3. Click *Load unpacked* and select this repository folder (the folder containing `manifest.json`).

Usage:
- Click the circular pointer button (top-right) to enable the inspect tool.
- While enabled: move the cursor to see the selector; click an element to draw a rounded rectangle around it. (Text popup removed.)
- Click the pointer button again to disable the tool. Press `Escape` to hide the overlay and popup.

Note: The extension will send prompts to your LLM server. Ensure your server is reachable at `http://130.225.39.167:3000/ask`.
The prompt sent is formatted exactly as:

Cookie popup text:
*The text from the selected region*
Input:
*Input from the field*

Addendum line included in prompts sent by the extension:
The user is inspecting an element in a popup and your response will be the replacement text, answer accordingly.

The background worker performs the POST request; this avoids CORS issues when calling your local server.
Files added:
- manifest.json — extension manifest (MV3)
- content-script.js — main logic (hover, click, popup)
- styles.css — minimal styling
- README.md — this file
