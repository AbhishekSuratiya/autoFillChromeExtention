# Adding a New Profile Field — Complete Developer Checklist

This document is the **single source of truth** for adding a new autofill field to the extension.
Every step below is mandatory. Skipping any one of them will cause the field to silently fail
in one or more parts of the product.

---

## Architecture Overview

The extension stores one flat object (`UserProfile`) in `chrome.storage.local`.  
Every feature that reads or writes profile data must be kept in sync manually.

```
src/
├── types.ts                  ← Data schema & defaults
├── content.ts                ← Webpage autofill engine (RULES array)
├── options/
│   ├── Options.tsx           ← Profile settings UI & tab definitions
│   └── Options.css           ← Styles for the settings page
└── popup/
    └── Popup.tsx             ← Extension sidebar
```

---

## The 7-Step Checklist

### Step 1 — `src/types.ts` · Data Schema

**1a. Add the key to `UserProfile`**

Place the field inside the correct section comment so it stays organised:

```ts
export interface UserProfile {
  // ...existing fields...

  // ── My New Section (or an existing one) ────────────
  myNewField: string;   // ← add here
}
```

Available section groupings:
| Section comment | Tab it belongs to |
|---|---|
| `// ── Personal` | `personal` |
| `// ── Online Presence` | `personal` |
| `// ── Address` | `address` |
| `// ── Professional` | `professional` |
| `// ── Education` | `education` |
| `// ── Work Experience` | `experience` (complex — see note) |
| `// ── Skills` | `skills` |
| `// ── Links` | `skills` |
| `// ── Diversity (optional)` | `diversity` |

> **Note:** Work experience uses a special `WorkExperience[]` array and dynamic index tracking in `fillForm`. Unless you are adding a *per-job* repeatable field, do not put it here.

---

**1b. Add a default value in `defaultProfile`**

```ts
export const defaultProfile: UserProfile = {
  // ...
  myNewField: '',   // ← always an empty string for plain text fields
};
```

---

**1c. Decide if it counts toward profile completion**

By default every key in `defaultProfile` contributes to the completion percentage.

- **If the field is required/core** → do nothing, it will be counted automatically.
- **If the field is optional / diversity-like** → add it to `optionalKeys` inside `getCompletionPercent`:

```ts
const optionalKeys: (keyof UserProfile)[] = [
  'gender', 'ethnicity', 'veteranStatus', 'disabilityStatus',
  'shortcuts' as any, 'customKeywords' as any, 'customFields' as any,
  'myNewField',   // ← add here if optional
];
```

---

### Step 2 — `src/content.ts` · Autofill Engine

This is the **most important step**. Without it the field will never be autofilled on any webpage.

**2a. Add the key to the local `Profile` interface**

The content script keeps its own inline type (not imported from `types.ts`):

```ts
interface Profile {
  // ...existing fields...
  myNewField: string;   // ← add here
}
```

**2b. Add a rule to the `RULES` array**

```ts
{
  field: 'myNewField',
  patterns: [
    // Exact name/id attribute values you expect platforms to use
    // All values are auto-normalised (lowercase, stripped of spaces/dashes/underscores)
    'mynewfield',
    'my_new_field',
    'mynewfieldname',
    // Add platform-specific variants:
    // Greenhouse:    'job_application[my_new_field]'
    // Lever:         'customField[myNewField]'
    // SmartRecruiters: 'my-new-field'
  ],
  labels: [
    // Visible label text that would appear next to the input on the page
    'my new field',
    'new field label',
    'alternative label wording',
  ],
},
```

**Scoring reference** — the matcher awards these scores:

| Match type | Score |
|---|---|
| `name` or `id` exact match | 10 |
| `name` or `id` partial match | 7 |
| `placeholder` exact match | 6 |
| `placeholder` partial match | 4 |
| Label text exact match | 9 |
| Label text partial/contains match | 5 |

Minimum score to trigger autofill: **4**. Make sure at least one pattern or label would reach this threshold on real-world job forms.

> 💡 **Tip:** Use browser DevTools on a real job application form to inspect the `name`, `id`, `placeholder`, and `<label>` text for the field you're targeting. Add those exact strings.

---

### Step 3 — `src/options/Options.tsx` · Tab Definition

**3a. Add the field key to the correct tab's `fields` array**

Find the `TABS` constant near the top of the file and add your key to the right tab:

```tsx
{
  id: 'professional',         // ← pick the matching tab id
  label: 'Professional',
  fields: [
    'currentTitle', 'desiredTitle', /* ... */
    'myNewField',   // ← add here
  ],
  icon: ( /* ... */ ),
},
```

This drives:
- The **completion badge** on the tab (how many fields are filled / total).
- The **tab progress indicator** shown in the sidebar.

---

**3b. Add the input element inside the correct tab panel**

Find the JSX block for that tab (search for `activeTab === 'professional'` etc.) and add a `<Field>` component:

```tsx
<Field
  label="My New Field"
  helper="Optional helper text shown below the input"
  fieldKey="myNewField"              // ← must match UserProfile key exactly
  customKeywords={profile.customKeywords}
  onKeywordChange={updateCustomKeyword}
>
  <input
    className="opt-input"
    placeholder="Enter value…"
    value={profile.myNewField}
    onChange={(e) => update('myNewField', e.target.value)}
  />
</Field>
```

The `fieldKey` + `onKeywordChange` props automatically render the **"Related keywords"** input beside your field, letting users add extra matching keywords without touching code.

> **For multi-line text** use `<textarea>` instead of `<input>`.  
> **For selects** use `<select>` with `<option>` elements.

---

### Step 4 — Import / Export Backup Compatibility

The import/export is handled by `handleImportBackup` in `Options.tsx`.

If your new field **could be missing** from older backup files (because users exported before the field existed), add a migration fallback:

```ts
const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
  // ...existing code...
  if (parsed && typeof parsed === 'object') {
    const p = parsed as UserProfile;
    // Migration guard — set default if field is absent in old backups
    if (p.myNewField === undefined) {
      p.myNewField = '';
    }
    // ...
  }
};
```

This guarantees old exported JSON files remain fully compatible after you add the field.

---

### Step 5 — Storage Load Backward-Compatibility

The `useEffect` that loads the profile from `chrome.storage.local` on mount also needs the same guard if the field might be absent from data stored by older versions of the extension:

```ts
useEffect(() => {
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (result[STORAGE_KEY]) {
      const p = result[STORAGE_KEY] as UserProfile;

      // Backward-compat guard
      if (p.myNewField === undefined) {
        p.myNewField = '';
      }

      setProfile(p);
      setCompletion(getCompletionPercent(p));
    }
  });
}, []);
```

---

### Step 6 — Sidebar (`src/popup/Popup.tsx`) — Optional but Recommended

If the field is important enough to display in the **sidebar stats** (e.g., "3 of 5 fields filled"), verify that:

1. `getCompletionPercent` in `types.ts` counts or excludes the field correctly (see Step 1c).
2. The real-time `chrome.storage.onChanged` listener in `Popup.tsx` will pick up the new value automatically — no changes needed there as it syncs the full profile object.

If you want the field's value displayed directly in the sidebar, add a display row inside the sidebar profile preview section.

---

### Step 7 — Testing the Full Flow

Run through this checklist manually after every new field:

- [ ] **Settings page** — Open `options.html`, navigate to the correct tab, verify the input appears, type a value, click **Save Profile**.
- [ ] **Completion badge** — Verify the tab badge shows the correct filled / total count.
- [ ] **Autofill** — Open a webpage with a matching input, click **Autofill Form** in the sidebar, confirm the field is filled.
- [ ] **Related keywords** — Add a custom keyword via the keywords input beside your field, reload the extension, autofill a page that uses that keyword in its input `name`/`id`.
- [ ] **Export backup** — Export the profile JSON, verify `myNewField` appears in the file with the correct value.
- [ ] **Import backup** — Clear the profile, import the backup JSON, verify the value is restored.
- [ ] **Old backup import** — Manually remove `myNewField` from the JSON and import it; verify no crash and the field defaults to `''`.
- [ ] **Real-time sync** — Keep the Options page and Popup sidebar open simultaneously. Change the value in Options and verify the sidebar updates without a page reload.

---

## Quick Reference — File Locations

| What to change | File |
|---|---|
| Type definition & default value | [`src/types.ts`](./src/types.ts) |
| Completion percentage exclusion | [`src/types.ts` → `getCompletionPercent`](./src/types.ts#L148) |
| Autofill engine matching rule | [`src/content.ts` → `RULES` array](./src/content.ts#L51) |
| Content script profile type | [`src/content.ts` → `interface Profile`](./src/content.ts#L20) |
| Tab field list | [`src/options/Options.tsx` → `TABS`](./src/options/Options.tsx#L7) |
| Settings form input | [`src/options/Options.tsx` → tab panel JSX](./src/options/Options.tsx) |
| Import/export migration guard | [`src/options/Options.tsx` → `handleImportBackup`](./src/options/Options.tsx) |
| Storage load migration guard | [`src/options/Options.tsx` → `useEffect`](./src/options/Options.tsx) |
| Settings page styles | [`src/options/Options.css`](./src/options/Options.css) |

---

## Decision Tree — Where Does My Field Go?

```
Is the field repeated per job entry (company, role, dates)?
│
├── YES → It belongs in the WorkExperience interface, not UserProfile.
│          See the expCompany / expRole pattern in content.ts RULES.
│
└── NO  → It belongs in UserProfile as a plain string.
           │
           ├── Is it personally identifiable / optional EEO data?
           │   └── YES → Add to optionalKeys in getCompletionPercent.
           │
           └── Is it a list of items (like shortcuts or custom fields)?
               └── YES → Use an array type (e.g. MyItem[]) and
                          define a dedicated interface. Follow the
                          ShortcutFill / CustomField pattern.
```

---

## Naming Conventions

| Concept | Convention | Example |
|---|---|---|
| `UserProfile` key | `camelCase` | `myNewField` |
| RULES `field` value | matches `UserProfile` key exactly | `'myNewField'` |
| RULES `patterns` entries | lowercase, no separators | `'mynewfield'` |
| RULES `labels` entries | lowercase with spaces | `'my new field'` |
| `<Field label=` prop | Title Case | `"My New Field"` |
| `value={profile.___}` | matches `UserProfile` key | `profile.myNewField` |
| `update('___', ...)` | matches `UserProfile` key | `update('myNewField', ...)` |

---

*Last updated: June 2026*
