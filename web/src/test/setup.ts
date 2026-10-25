import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => undefined,
		removeListener: () => undefined,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		dispatchEvent: () => false,
	}),
});

// Mantine's Combobox (MultiSelect, S6) and ScrollArea observe their size; jsdom
// has no ResizeObserver, so give them one that never fires (Mantine's testing guide).
class NoopResizeObserver
{
	observe(): void
	{}

	unobserve(): void
	{}

	disconnect(): void
	{}
}
window.ResizeObserver = NoopResizeObserver;
Element.prototype.scrollIntoView = () => undefined;

// Floating UI (Mantine's Combobox dropdowns) asks `matches(":popover-open")` and
// `matches(":modal")` on every position update. jsdom's selector engine doesn't
// know those pseudo-classes and throws each time, which is slow enough that
// a Select starves the event loop for seconds. Neither state can hold in jsdom
// (no top layer), so answer false directly.
const matches = Element.prototype.matches;
Element.prototype.matches = function (selector: string): boolean
{
	return selector === ":popover-open" || selector === ":modal" ? false : matches.call(this, selector);
};
