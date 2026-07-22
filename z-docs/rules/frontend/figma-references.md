# Figma design references

The live design source for Ambi is the **Ambi-DS** Figma file (file key `gWOvYXLf21iAzGDcNHsY2U`).
Anyone doing UI work — implementing a component, checking a spacing/color value, or comparing a
built screen against spec — should go to the relevant page below rather than guessing from
screenshots or memory.

| Page                          | Covers                                                              | Link                                                                                          |
| ------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Main design (brand identity)  | Brand colors, type scale, logo lockups, the source tokens for `tokens.css` | <https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Ambi-DS?node-id=0-1&p=f&m=draw>           |
| Component library             | The DS component set (`Btn`/`IconBtn` variants, form inputs, cards, etc.) | <https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Ambi-DS?node-id=637-2745&p=f&m=draw>      |
| Misc graphic assets           | Icons, illustrations, and other non-component graphics               | <https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Ambi-DS?node-id=637-4710&p=f&m=draw>      |
| Deck editor designs           | All deck-editor screens and panels (slide canvas, sidebars, drawers)  | <https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Ambi-DS?node-id=637-6750&p=f&m=draw>      |
| Live session designs          | All live-session screens (host board, player view, round states)     | <https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Ambi-DS?node-id=637-6751&p=f&m=draw>      |
| Other pages                   | Everything not covered above (marketing, account, misc flows)        | <https://www.figma.com/design/gWOvYXLf21iAzGDcNHsY2U/Ambi-DS?node-id=637-6752&p=f&m=draw>      |

## How this relates to other Figma docs

- [Named color combinations & button variants](../styling/color-and-button-variants.md) treats the
  **component library** page above as the live catalog for text/background pairings and button
  variants — if this doc and that page disagree, the Figma page wins.
- [Figma Code Connect](../../features/code-connect.md) documents the separate, component-level
  `figma.connect()` mappings (`Btn`, `IconBtn`) that let Figma Dev Mode show real code snippets —
  narrower in scope than this page map, and gated behind a Figma plan upgrade.
