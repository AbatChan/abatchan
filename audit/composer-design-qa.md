# Site guide composer design QA

## Evidence

- Structural reference: `/Users/macbookair2020/Documents/Screenshots/Screenshot 2026-08-22 at 2.07.27 AM.png`
- Browser-rendered implementation: `audit/composer-desktop-local.jpg`
- Focused comparison: `audit/composer-comparison.png`
- Deployed mobile verification: `audit/composer-mobile-preview.jpg`
- State: dark theme, guide open, default `Ask first` approval mode, `Concise` answer depth.

## Visual findings

- The writing area and bottom utility rail follow the reference structure without copying its palette or branding.
- The composer keeps the existing abatchan indigo signal, glass surface, typography, rounded geometry, and tooltip behavior.
- The rail stays legible inside the existing 380px guide panel. Labels truncate safely, icon targets remain distinct, and the circular send control retains primary emphasis.
- At a 390 × 844 viewport the page and composer remain exactly 390px wide, with no horizontal overflow; the 344px rail fits its 344px client width.
- The approval choice and answer-depth choice open upward so their menus do not collide with the viewport bottom.
- Project-detail attachments appear as compact removable chips rather than expanding the utility rail.

## Interaction checks

- Text project details can be selected through the native file chooser and appear in the composer before sending.
- Approval and answer-depth choices update their checked state and persist through reload.
- Dictation is exposed only when browser speech recognition is available; unsupported browsers receive a disabled control with an explanatory tooltip.
- During generation, the send control becomes a stop control. A stopped or failed visitor message remains retryable.
- `Ask first` requires a separate navigation confirmation. `Allow actions` may navigate only after the model returns a verified same-origin destination for a clear visitor request.
- Image files are accepted as references, but only their name, type, and size are sent because the configured DeepSeek model cannot inspect image pixels.

## Result

No actionable P0, P1, or P2 visual differences remain for the requested structural translation.

final result: passed

## Tooltip and density refinement

- Compared against `/Users/macbookair2020/Documents/Screenshots/Screenshot 2026-08-22 at 2.32.33 AM.png` at a 390 × 844 viewport.
- Long tooltip copy now uses centered normal wrapping, a 280px cap, and a 12px viewport gutter. The approval tooltip measured 234px wide, stayed fully inside the viewport, and had no horizontal text overflow.
- The composer was tightened from 10px to 8px internal padding, with a 38px writing area and a 36px desktop send control. Touch devices retain the existing 40px control targets.
- The explanatory note has horizontal padding only. Its top and bottom padding both resolve to 0px.
- The send and stop states retain their accessible names but expose no visual tooltip.
- The header subtitle now reads `site help, backed by Abat`, reducing visual noise without losing the human-support promise.

final result: passed
