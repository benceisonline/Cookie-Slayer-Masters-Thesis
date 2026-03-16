# Cookie Slayer Extension
Installation (developer mode):

1. Open Chrome and go to `chrome://extensions/`.
2. Enable *Developer mode* (top-right).
3. Click *Load unpacked* and select this repository folder (the folder containing `manifest.json`).
4. Optional: For easier testing, click *Details* button and allow for incognito.

Usage:
- WIP

Note: The extension will send prompts to your LLM server. Ensure your server is reachable at `http://130.225.39.167:3000/ask`.
The prompt sent is formatted exactly as:

Cookie popup text:
*The text from the selected region*
Input:
*Input from the field*

Addendum line included in prompts sent by the extension:
The user is inspecting an element in a popup and your response will be the replacement text, answer accordingly.

The background worker performs the POST request; this avoids CORS issues when calling your local server.
