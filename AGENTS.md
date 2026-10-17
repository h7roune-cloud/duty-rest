<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- LOVABLE:BEGIN-APP -->
> [!IMPORTANT]
> Hardware back navigation is owned by `src/lib/back-button.ts`: it keeps a stack
> of active handlers and `useBackHandler(active, onBack)` is how a screen takes
> part. Register low-priority handlers first (quit), high-priority ones last
> (open dialogs), because the topmost handler consumes the press. Never wire
> `@capacitor/app` directly inside a screen — the plugin must stay behind this
> module so the same code runs in the browser and in the APK.
<!-- LOVABLE:END-APP -->
