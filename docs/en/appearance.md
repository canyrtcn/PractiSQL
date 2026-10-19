# Appearance and character motion

[English](../en/appearance.md) | [Türkçe](../tr/appearance.md)

PractiSQL provides Light, Leaf and Dark themes. The title pairs an enlarged database icon with the artwork’s lettering, with the SQL portion highlighted in green. The icon retains its original thin frame without an additional surrounding border. Dark mode uses a lighter green; the icon’s own light backing maintains contrast.

## Typography

Settings → Interface font offers the system default, PractiSQL · Nunito, Nunito and Manrope. The selection is remembered on this device and can be changed without restarting. The PractiSQL pairing keeps the display lettering in the wordmark and uses Nunito at a slightly stronger text weight for the interface. Existing Display selections use this pairing automatically. SQL editing and code blocks keep their monospace fonts and normal weight.

PractiSQL Display is a custom adaptation of [Titan One](https://github.com/google/fonts/tree/main/ofl/titanone). Its nine wordmark characters use outlines derived from the project’s promotional artwork; the remaining characters retain Titan One’s design, with a dotted capital I added for Turkish. This preserves the artwork’s lettering rather than asserting an unverified commercial font identity. The bundled font supports Turkish and English.

Nunito and Manrope are additional interface choices. All three families are packaged locally under the SIL Open Font License 1.1, with attribution and license files beside the font files in `renderer/assets/fonts/`. Selecting a font makes no network request and does not install a system font.

The installer uses the same local display typeface. Its header and sidebar can be regenerated with `python scripts/build-installer-brand.py`, using Pillow.

## Main workshop

The centre stays focused on SQL editing and results. The empty workshop offers a light three-step lesson path and links to lessons without a permanent banner above the editor. During a lesson practice session, the existing return-to-lesson control stays available.

The sidebar groups the profile, XP, statistics and weekly goal into one compact learning panel. Workspace folders and chats use the same borders and depth. The editor and result table keep their focus feedback. The right-hand tabs use icons and a sliding active surface that follows window resizing. Motion respects the Animations setting and reduced-motion preference. Short windows retain a usable workspace list and a scrollable sidebar.

## Conversation formatting

Markdown headings retain four levels of visual and accessible hierarchy. Lists, quotes, inline code and rounded tables share the selected theme. SQL blocks use a separate readable syntax palette for each theme; Copy and Transfer to editor preserve the original SQL text. These presentation styles do not change the AI persona, prompts or execution pipeline.

## Character motion

The learning companion uses body movement, eye expression and foot movement, without arms. Its 23 performances include a body greeting, looking around, stretching, tapping a foot, swaying, a proud pose, a sleepy expression, winking, balancing, shuffling, bowing and small hops. Explicit interactions and learning events also trigger turns and celebrations. Blinks scale around the eyes’ own centre to keep them in place.

Idle performances rotate through a shuffled sequence. They share the existing roaming frame loop, pause during dragging, thinking and reading a hint, and stop when the window is hidden. The Animations preference also stops them. Clothing remains attached to the same animated character, while text bubbles stay outside its body transforms.

Right-click the companion → Walking frequency offers Occasional, Balanced and Frequent. It changes the pauses between walks and remembers the selection on this device. The Starter Bandana and Starter Waistcoat are available at zero XP. Denim Overalls, Varsity Jacket, Research Coat and Explorer Vest unlock as XP grows, alongside other accessories. All six fitted outfits leave the eyes, cheeks and mouth clear; previously owned clothing stays available.

## Notifications and avatars

Welcome messages, information and achievements share one compact notification in the centre of the existing title bar. They do not cover the SQL editor or shift the workspace. Additional messages wait in a queue; its counter advances to the next message. Hovering or focusing a notification pauses its timeout. Achievement notifications retain a shortcut to the badge collection.

The profile chooser contains 48 avatars in four categories. Their artwork is optically framed within a common square; uploaded photos retain their centre crop. The badge collection initially shows four rows, with Show more and Show less controls. Expanding the collection does not change ownership or progress. Existing profile identity and saved progress are preserved.

## First paint

The saved language and theme are passed to the initial page before it paints. A new installation starts with the English opening caption. Database loading and recovery finish before the application is handed over; account discovery can complete in the background, with its connection state shown separately.

The native window stays transparent until its first composed frame is ready. The opening mark zooms into place once, without vertical floating, and the first-run dialog follows the opening animation. The provider step welcomes the saved profile name and explains the connection choices. The chosen setup language also applies to the profile controls.

Study PDFs pair the mascot with the same bundled PractiSQL display lettering. Only the wordmark uses the display font; document text and SQL retain their reading and monospace fonts.
