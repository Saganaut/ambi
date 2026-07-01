// Right-rail chat/reaction widget. The Gen-2 read model carries no chat log or
// reaction feed (those topics aren't part of the rebuilt live session yet), so
// the widget has nothing to render and is intentionally inert until a future
// chunk adds them. Kept mounted so the page layout is unchanged.
const SessionChat = () => null;

export { SessionChat };
