// Sample TipTap-style HTML strings for the RichTextDisplay stories. These
// mirror the markup RichTextInput produces: bold / underline / strike marks,
// inline color + font-size spans, links, lists, and headings.

export const richHtml = `<p>In the land of <strong>Mordor</strong> where the <span style="color: #e53e3e">shadows</span> lie.</p>`;

export const styledHtml = `<h3>One Ring</h3><p>Three Rings for the <strong>Elven-kings</strong> under the sky, <u>Seven</u> for the <s>Dwarf-lords</s> in their halls of stone.</p><p><span style="font-size: 1.25rem; color: #3182ce">Nine</span> for Mortal Men doomed to die.</p>`;

export const listHtml = `<p>Members of the Fellowship:</p><ul><li>Frodo</li><li>Samwise</li><li>Gandalf</li><li>Aragorn</li></ul>`;

export const linkHtml = `<p>Read more at <a href="https://example.com">the archive</a> when you have time.</p>`;

export const longHtml = `<p>Many that live deserve death. And some that die deserve life. Can you give it to them, Frodo? Do not be too eager to deal out death in judgement.</p>`;
