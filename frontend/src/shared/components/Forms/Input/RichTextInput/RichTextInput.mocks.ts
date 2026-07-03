// Sample initial editor content for the RichTextInput stories. The component's
// value/onChange API is an HTML string in / HTML string out, matching what
// TipTap emits.

export const initialHtml = `<p>Click to edit. Select text to reveal the <strong>formatting</strong> toolbar.</p>`;

export const styledHtml = `<p>The road goes <strong>ever on</strong> and <u>on</u>, down from the door where it <s>began</s>.</p>`;

export const emptyHtml = "";

// Content for the block variant: a large-font lead line and a bulleted list
// whose items carry per-item color and size, so the fill-height layout and the
// marker-follows-text (color + size) behaviour are both visible.
export const blockHtml = `<p><span style="font-size: 2.75rem">Fellowship of the Ring</span></p><ul><li style="color: #e53e3e; font-size: 1.875rem"><span style="color: #e53e3e; font-size: 1.875rem">Frodo carries the Ring</span></li><li style="color: #3182ce"><span style="color: #3182ce">Gandalf leads the way</span></li><li>Sam stays loyal</li></ul>`;
