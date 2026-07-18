# Guide: Placeholder Pages (The Scaffolding Pattern)

**Covers:** The ~30 page files across the project that follow this identical pattern:

```typescript
import { PlaceholderView } from "@/components/placeholder-view";

export default function Page() {
  return (
    <PlaceholderView
      title="Feature Flags"
      description="Flag management with rollout controls and ownership."
    />
  );
}
```

---

## Purpose

OpsForge has around 30 routes in its navigation: Feature Flags, Audit Logs, Incident Timelines, Role Management, and so on. Most of them aren't built yet. Instead of leaving them as 404 errors or blank screens, each route has a small page file that renders a `PlaceholderView` component -- a simple card that shows the feature's name and a short description of what it will eventually do.

This is a scaffolding pattern. It's not laziness; it's a deliberate development strategy. Let's talk about why.

---

## Line-by-Line Walkthrough

```typescript
import { PlaceholderView } from "@/components/placeholder-view";
```

Imports the shared placeholder component. Every placeholder page imports the same component. The only thing that varies between pages is the `title` and `description` props.

```typescript
export default function Page() {
```

`Page` is a valid name for a Next.js page component. Some developers name their page functions descriptively (`FeatureFlagsPage`, `AuditLogPage`), while others use the generic `Page` since the file path already describes what page it is. In this project, the placeholder pages use the generic name because they're temporary -- when you replace the placeholder with a real implementation, you'll rename the function anyway.

```typescript
  return (
    <PlaceholderView
      title="Feature Flags"
      description="Flag management with rollout controls and ownership."
    />
  );
}
```

Two props, both strings. The `title` is the feature name (shown as a heading), and the `description` summarizes what the feature will do (shown as body text). That's it. The component handles all the visual styling -- the card, the icon, the layout.

---

## Why Scaffold Pages This Way?

### 1. Navigation works from day one

The sidebar in OpsForge lists every section of the application. If half those links led to 404 pages, the app would feel broken and the navigation would be unreliable for both developers and stakeholders. Placeholder pages make every link functional immediately.

### 2. Route structure is validated early

By creating the actual file at `src/app/(app)/feature-flags/page.tsx`, you confirm that the routing works. You discover organizational problems early: "Should this be a nested route? Does this conflict with another route? Does the layout wrap it correctly?" These are easier to fix now than after building the full feature.

### 3. Stakeholders can see the plan

When a product manager or designer clicks through the app, they see every planned feature listed with its description. It's a living roadmap. They can give feedback on the information architecture ("this should be under Settings, not under Platform") before any real code is written.

### 4. Developers can work independently

When 30 pages exist as placeholders, any developer can pick one and start building without waiting for someone else. The file exists, the route exists, the layout wraps it correctly. Just replace the `PlaceholderView` with real content.

### 5. The app always works

There's no "broken state" during development. Every route returns a valid page. Tests that navigate through the app won't crash. Screenshots in pull requests look coherent. This matters more than you'd think on a team.

---

## The PlaceholderView Component

While we're not doing a full walkthrough of `placeholder-view.tsx` here, it's worth understanding what it likely contains:

- A centered card layout.
- The `title` rendered as a heading.
- The `description` rendered as paragraph text.
- Possibly an icon or illustration indicating "under construction."
- Consistent styling that matches the rest of the app.

The component is intentionally simple. Its job is to be replaced. Think of it as a "coming soon" sign that you tear down when the real store opens.

---

## Concepts Taught

- **Scaffolding pattern:** Building the skeleton of an application before filling in the details.
- **Component reuse:** One component (`PlaceholderView`) used across 30+ files with different props.
- **Next.js file-based routing:** Each page file in the `app/` directory creates a URL route automatically. The file system is the router.
- **Props as configuration:** The same component produces different content based on the props it receives. This is the most fundamental pattern in React.
- **Separation of structure from implementation:** The route structure (files, folders, URLs) is designed independently from the feature logic.
- **Incremental development:** Building an application piece by piece, always keeping it in a working state.

---

## Common Mistakes

1. **Skipping the placeholder and leaving routes as 404s.** This seems harmless but creates problems: navigation links that go nowhere confuse users and developers alike, and it makes it harder to test the overall app structure.

2. **Making the placeholder too complex.** Some developers are tempted to add interactivity, mock data, or partial UI to placeholders. Resist this. A placeholder should be obviously a placeholder. If it looks half-built, people might think it's a buggy feature rather than an intentional stub.

3. **Forgetting to replace placeholders before shipping.** This is the flip side. Placeholders are for development, not production. Before release, you should audit all pages and either build the feature or remove the route from the navigation. Shipping a "coming soon" page to real users is unprofessional.

4. **Inconsistent title/description values.** If the navigation says "Feature Flags" but the placeholder says "Flag Management," users will be confused about whether they're on the right page. Keep the title prop consistent with the navigation label.

5. **Not making a shared component.** Some developers copy-paste the placeholder JSX into every page file instead of extracting it into a component. This means when you want to update the placeholder design (add a "coming soon" icon, change the wording), you have to edit 30 files instead of one.

---

## Mini Exercises

### Exercise 1: Create a new placeholder page
Pick a feature that doesn't exist yet (e.g., "Data Export" at `/data-export`). Create the page file at the correct path in the `(app)` route group. Import `PlaceholderView`, give it an appropriate title and description, and verify the route works in your browser. Then add a link to it in the navigation.

### Exercise 2: Replace a placeholder with real content
Pick any existing placeholder page. Replace the `PlaceholderView` with something simple but real -- even just a heading, a paragraph, and a list of items. Notice how the layout (sidebar, header, auth) all still work perfectly because they come from the parent layout, not the page.

### Exercise 3: Count the placeholders
Write a quick command or manually search the project for all files that import `PlaceholderView`. How many are there? List them. This gives you a map of everything that still needs to be built -- which is useful for planning work.

Hint: You can search with your editor's "Find in Files" feature or use the terminal:
```bash
grep -r "PlaceholderView" src/app --include="*.tsx" -l
```

---

## Further Reading

- **Next.js routing:** [Next.js Docs -- Defining Routes](https://nextjs.org/docs/app/building-your-application/routing/defining-routes)
- **React component reuse:** [React Docs -- Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component)
- **Incremental development:** [Martin Fowler -- Evolutionary Architecture](https://martinfowler.com/articles/evo-arch-governance.html) (the broader philosophy behind building incrementally)
- **Scaffolding in software:** [Wikipedia -- Scaffold (programming)](https://en.wikipedia.org/wiki/Scaffold_(programming)) (background on the concept)
- **Information architecture:** [Nielsen Norman Group -- IA](https://www.nngroup.com/articles/ia-vs-navigation/) (why the structure of your routes matters)
