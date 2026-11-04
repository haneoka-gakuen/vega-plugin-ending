# Vega Ending

Vega Ending closes a story properly. When the last command of a
[Vega](https://github.com/haneoka-gakuen/vega) story finishes, it fades in an
ending screen over the stage — a heading, an optional closing line, and buttons
to play again or return to the title screen — instead of leaving the player on
a frozen last frame.

It is a small, self-contained UI plugin with no game assets, and it is
included in [Vega Full Preset](https://github.com/haneoka-gakuen/vega-preset-full).
Replace it with your own ending UI whenever a project needs something
different.

## Install

```sh
pnpm add @haneoka/vega @haneoka/vega-plugin-ending
```

## Use it

```ts
import { VegaEngine } from "@haneoka/vega/engine";
import { createVegaEndingPlugin } from "@haneoka/vega-plugin-ending";

const engine = new VegaEngine({
  plugins: [
    createVegaEndingPlugin({
      heading: "The End",
      message: "Thank you for playing.",
      replayLabel: "Play again",
      titleLabel: "Title",
    }),
  ],
});
```

The default export, `vegaEndingPlugin`, follows the shell's interface language,
then the document language. Default labels are available in English, Japanese,
Korean, Simplified Chinese and Traditional Chinese. The table shows English defaults.

## Options

| Option          | Meaning                                                  | Default     |
| --------------- | -------------------------------------------------------- | ----------- |
| `heading`       | Main line, also the screen's accessible name             | `"The End"` |
| `message`       | Optional short line under the heading                    | none        |
| `replay`        | Show a button that restarts the story from the beginning | `true`      |
| `replayLabel`   | Its text                                                 | `"Replay"`  |
| `returnToTitle` | Show a button that returns to the title screen           | `true`      |
| `titleLabel`    | Its text                                                 | `"Title"`   |

The title button only appears when a shell that has a title screen, such as
[Vega Default Shell](https://github.com/haneoka-gakuen/vega-shell-default), is
installed. Explicit labels override localization and remain unchanged.

## Behaviour

- The screen is mounted in the `after-stage` UI slot and appears when the
  player's state becomes `finished`; it disappears again if playback restarts
  or seeks back.
- Focus moves to the first button (or the heading) when it appears, so
  keyboard and screen-reader users land on it.
- Replay rewinds the same player to the first command; return-to-title hands
  over to the shell.

## License

MPL-2.0. See [LICENSE](LICENSE).
