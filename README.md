# `@haneoka/vega-plugin-ending`

Ending presentation for Vega. It appears when playback completes and can
restart the story or return to the title screen when the default shell is
available.

```ts
import { createVegaEndingPlugin } from "@haneoka/vega-plugin-ending";

const plugin = createVegaEndingPlugin({
  heading: "The End",
  message: "Thank you for playing.",
});
```

The plugin contains no game assets and can be replaced by a project-specific
ending UI.
