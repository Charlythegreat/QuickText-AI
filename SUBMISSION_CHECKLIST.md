# QuickText AI - Store Submission Checklist

Use this checklist before submitting to any browser extension store.

---

## General Preparation

### Code Quality
- [ ] All features work correctly in target browser
- [ ] No console errors or warnings
- [ ] No unused code or dead imports
- [ ] Code is not obfuscated (or source provided)
- [ ] All dependencies are up to date (`npm audit` passes)

### Permissions
- [ ] Only requesting necessary permissions
- [ ] Each permission can be justified
- [ ] No `<all_urls>` in permissions (use `host_permissions` instead)
- [ ] `activeTab` used instead of broad tab access

### Assets
- [ ] Icons in all required sizes (16x16, 48x48, 128x128)
- [ ] Icons are clear and recognizable
- [ ] Screenshots show actual functionality
- [ ] Screenshots match target browser (Chrome/Firefox/Edge)
- [ ] No competitor branding in screenshots

### Legal
- [ ] Privacy Policy is hosted and accessible
- [ ] Terms of Service are complete
- [ ] GDPR compliance (for EU users)
- [ ] No copyrighted content without permission

---

## Chrome Web Store Checklist

### Manifest
- [ ] `manifest_version`: 3
- [ ] `name`: Under 45 characters
- [ ] `description`: Under 132 characters
- [ ] `version`: Follows semver (1.0.0)
- [ ] `author` field included

### Store Listing
- [ ] Title: Clear, descriptive (no keyword stuffing)
- [ ] Short description: 132 chars max
- [ ] Detailed description: Explains all features
- [ ] Category: Productivity
- [ ] Language: Primary language set

### Screenshots
- [ ] At least 1 screenshot (up to 5)
- [ ] Size: 1280x800 or 640x400
- [ ] Shows extension in action
- [ ] No misleading imagery

### Promotional Images
- [ ] Small tile: 440x280 (optional but recommended)
- [ ] Marquee: 1400x560 (optional)

### Policies
- [ ] Privacy policy URL provided
- [ ] Single purpose clearly defined
- [ ] No remote code execution
- [ ] All data handling disclosed

### Build
```bash
cd extension
zip -r ../quicktext-ai-chrome.zip . -x "*.DS_Store" -x "*.map"
```

---

## Firefox Add-ons Checklist

### Manifest
- [ ] `manifest_version`: 2 (required for Firefox)
- [ ] `browser_specific_settings.gecko.id` set
- [ ] `browser_specific_settings.gecko.strict_min_version` set
- [ ] `browser_action` (not `action`)
- [ ] `background.scripts` (not service worker)

### Code Requirements
- [ ] No `chrome.` APIs (use `browser.` or polyfill)
- [ ] No `innerHTML` with untrusted content
- [ ] No `eval()` or `new Function()`
- [ ] Content Security Policy compliant

### Source Code
- [ ] Source code ready to upload (if minified)
- [ ] Build instructions in README
- [ ] All dependencies listed in package.json

### Store Listing
- [ ] Name: Clear and unique
- [ ] Summary: Brief description
- [ ] Description: Full feature list
- [ ] Categories selected

### Build
```bash
./scripts/build-firefox.sh
# Output: dist/quicktext-ai-firefox.zip
```

---

## Microsoft Edge Add-ons Checklist

### Manifest
- [ ] `manifest_version`: 3
- [ ] All Chrome manifest requirements met
- [ ] `author` field included

### Edge-Specific
- [ ] Tested in Microsoft Edge browser
- [ ] No Chrome-specific branding
- [ ] Screenshots taken in Edge

### Store Listing
- [ ] Product name (unique on Edge store)
- [ ] Short description: 132 chars
- [ ] Description: Up to 10,000 chars
- [ ] Support contact provided

### Build
```bash
cd extension
zip -r ../quicktext-ai-edge.zip . -x "*.DS_Store" -x "manifest.firefox.json"
```

---

## Pre-Submission Final Check

### Test in Each Browser
- [ ] Chrome: `chrome://extensions/` → Load unpacked
- [ ] Firefox: `about:debugging` → Load Temporary Add-on
- [ ] Edge: `edge://extensions/` → Load unpacked

### Functionality Tests

| Feature | Chrome | Firefox | Edge |
|---------|--------|---------|------|
| Popup opens | ☐ | ☐ | ☐ |
| Text input works | ☐ | ☐ | ☐ |
| Rewrite action | ☐ | ☐ | ☐ |
| Polite action | ☐ | ☐ | ☐ |
| Professional action | ☐ | ☐ | ☐ |
| Short action | ☐ | ☐ | ☐ |
| Context menu works | ☐ | ☐ | ☐ |
| Copy to clipboard | ☐ | ☐ | ☐ |
| Language switching | ☐ | ☐ | ☐ |
| Error handling | ☐ | ☐ | ☐ |

### API Connection Tests
- [ ] API responds correctly
- [ ] Rate limiting works
- [ ] Error messages display correctly
- [ ] Timeout handling works

---

## After Submission

### Chrome Web Store
- Expected review time: 1-3 business days
- Check status at: https://chrome.google.com/webstore/devconsole

### Firefox Add-ons
- Expected review time: 1-2 days
- Check status at: https://addons.mozilla.org/developers/addons

### Edge Add-ons
- Expected review time: 2-4 business days
- Check status at: https://partner.microsoft.com/dashboard/microsoftedge/overview

---

## Common Rejection Fixes

### "Insufficient permissions justification"
→ Add detailed explanation for each permission in store listing

### "Code quality issues"
→ Remove unused code, fix linting errors, add comments

### "Misleading functionality"
→ Ensure description exactly matches what extension does

### "Privacy policy incomplete"
→ Add sections for: data collected, data use, third parties, retention

### "Remote code execution"
→ Bundle all JavaScript locally, no external script loading

---

## Version Update Checklist

When releasing updates:

- [ ] Increment version in manifest.json
- [ ] Update changelog/release notes
- [ ] Test upgrade path (existing users)
- [ ] Verify stored data migration
- [ ] Re-run all functionality tests
- [ ] Update screenshots if UI changed
- [ ] Submit for review

---

## Quick Description Templates

### Chrome Web Store (132 chars max)
```
Free AI text assistant - rewrite, polish & transform any text instantly. Supports 5 languages. No sign-up required!
```

### Detailed Description
```
QuickText AI - Free & Unlimited Text Assistant

Transform your writing with AI-powered text generation:

✨ FEATURES
• Rewrite - Rephrase text while keeping the meaning
• Make Polite - Transform casual text into polite language
• Make Professional - Upgrade text for business communication
• Make Shorter - Condense text while preserving key points

🌍 MULTILINGUAL SUPPORT
Works in English, French, Spanish, Portuguese, and Hindi

🆓 COMPLETELY FREE
No subscriptions, no limits, no sign-up required

🔒 PRIVACY-FIRST
Your text is processed securely and never stored

HOW TO USE
1. Select any text on a webpage
2. Right-click → QuickText AI → Choose an action
3. Or click the extension icon to use the popup interface

Powered by Llama 3, the state-of-the-art open-source AI model.
```

---

*Last updated: January 2026*
