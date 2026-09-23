import { defineVegaPlugin, type VegaDisposable, type VegaPlugin, type VegaUiSlotContext } from "@haneoka/vega/plugin";
import { VEGA_SHELL_CONTROLLER, type VegaShellController } from "@haneoka/vega/shell";

export interface VegaEndingPluginOptions {
  /** Main line shown after the final command completes. */
  readonly heading?: string;
  /** Optional short closing line. */
  readonly message?: string;
  readonly replayLabel?: string;
  readonly titleLabel?: string;
  /** Keep replay available. Defaults to true. */
  readonly replay?: boolean;
  /** Show return-to-title when a shell controller is installed. Defaults to true. */
  readonly returnToTitle?: boolean;
}

type VegaShellControllerWithTitle = VegaShellController & {
  returnToTitle?(): Promise<void> | void;
};

const ENDING_CSS = String.raw`
.vega-ending {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: clamp(24px, 7cqh, 72px);
  background:
    radial-gradient(circle at 50% 42%, rgb(25 35 58 / 20%), transparent 44%),
    linear-gradient(180deg, rgb(2 5 12 / 28%), rgb(2 5 12 / 82%));
  color: #fff;
  font-family: inherit;
  opacity: 0;
  pointer-events: none;
  transition: opacity 420ms ease;
}
.vega-ending[hidden] {
  display: none !important;
}
.vega-ending[data-visible="true"] {
  opacity: 1;
  pointer-events: auto;
}
.vega-ending__content {
  width: min(38rem, 100%);
  text-align: center;
  text-shadow: 0 2px 16px rgb(0 0 0 / 72%);
  transform: translateY(10px);
  transition: transform 420ms ease;
}
.vega-ending[data-visible="true"] .vega-ending__content {
  transform: translateY(0);
}
.vega-ending__rule {
  width: 44px;
  height: 1px;
  margin: 0 auto 22px;
  border: 0;
  background: currentColor;
  opacity: .72;
}
.vega-ending__heading {
  margin: 0;
  font-size: clamp(2rem, 7cqh, 4.75rem);
  font-weight: 500;
  letter-spacing: .12em;
  line-height: 1.08;
}
.vega-ending__message {
  max-width: 34rem;
  margin: 18px auto 0;
  font-size: clamp(.9rem, 2.4cqh, 1.1rem);
  line-height: 1.7;
  opacity: .78;
}
.vega-ending__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: clamp(28px, 5cqh, 48px);
}
.vega-ending__button {
  min-width: 8.5rem;
  min-height: 44px;
  padding: 10px 22px;
  border: 1px solid rgb(255 255 255 / 42%);
  border-radius: 999px;
  background: rgb(8 13 26 / 34%);
  color: inherit;
  font: inherit;
  font-size: .9rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
}
.vega-ending__button:hover,
.vega-ending__button:focus-visible {
  border-color: rgb(255 255 255 / 86%);
  background: rgb(255 255 255 / 14%);
  outline: none;
}
.vega-ending__button:disabled {
  cursor: wait;
  opacity: .5;
}
@media (prefers-reduced-motion: reduce) {
  .vega-ending,
  .vega-ending__content {
    transition-duration: .001ms;
  }
}
`;

const element = <K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  node.className = className;
  return node;
};

const startFrames = (host: HTMLElement, signal: AbortSignal, frame: () => void): (() => void) => {
  const view = host.ownerDocument.defaultView;
  const request =
    view?.requestAnimationFrame?.bind(view) ??
    ((callback: FrameRequestCallback) => view?.setTimeout(() => callback(Date.now()), 16) ?? 0);
  const cancel = view?.cancelAnimationFrame?.bind(view) ?? ((handle: number) => view?.clearTimeout(handle));
  let active = true;
  let handle = 0;
  const tick: FrameRequestCallback = () => {
    if (!active || signal.aborted) return;
    frame();
    handle = request(tick);
  };
  handle = request(tick);
  const stop = () => {
    if (!active) return;
    active = false;
    cancel(handle);
  };
  signal.addEventListener("abort", stop, { once: true });
  return () => {
    signal.removeEventListener("abort", stop);
    stop();
  };
};

const restart = async (context: VegaUiSlotContext, shell: VegaShellController | undefined): Promise<void> => {
  context.state.finished = false;
  if (shell) {
    await shell.start();
    return;
  }
  context.player.pause();
  await context.player.replayFromStartTo(0);
  context.state.finished = false;
  context.player.resume();
  await context.player.play();
};

const mountEnding = (
  host: HTMLElement,
  context: VegaUiSlotContext,
  options: VegaEndingPluginOptions,
): VegaDisposable => {
  const document = host.ownerDocument;
  const style = document.createElement("style");
  style.textContent = ENDING_CSS;
  const root = element(document, "section", "vega-ending");
  root.dataset.visible = "false";
  root.hidden = true;
  root.setAttribute("aria-label", options.heading ?? "The End");

  const content = element(document, "div", "vega-ending__content");
  const rule = element(document, "hr", "vega-ending__rule");
  const heading = element(document, "h2", "vega-ending__heading");
  heading.textContent = options.heading ?? "The End";
  heading.tabIndex = -1;
  content.append(rule, heading);
  if (options.message) {
    const message = element(document, "p", "vega-ending__message");
    message.textContent = options.message;
    content.append(message);
  }

  const shell = context.services(VEGA_SHELL_CONTROLLER) as VegaShellControllerWithTitle | undefined;
  const actions = element(document, "div", "vega-ending__actions");
  const buttons: HTMLButtonElement[] = [];
  let busy = false;
  const run = async (operation: () => void | Promise<void>) => {
    if (busy) return;
    busy = true;
    for (const button of buttons) button.disabled = true;
    try {
      await operation();
    } finally {
      busy = false;
      for (const button of buttons) button.disabled = false;
    }
  };

  if (options.replay !== false) {
    const replay = element(document, "button", "vega-ending__button");
    replay.type = "button";
    replay.textContent = options.replayLabel ?? "Replay";
    replay.addEventListener("click", () => void run(() => restart(context, shell)));
    buttons.push(replay);
    actions.append(replay);
  }
  if (options.returnToTitle !== false && typeof shell?.returnToTitle === "function") {
    const title = element(document, "button", "vega-ending__button");
    title.type = "button";
    title.textContent = options.titleLabel ?? "Title";
    title.addEventListener(
      "click",
      () =>
        void run(() => {
          context.state.finished = false;
          return shell.returnToTitle?.();
        }),
    );
    buttons.push(title);
    actions.append(title);
  }
  if (buttons.length) content.append(actions);
  root.append(content);
  host.append(style, root);

  let visible = false;
  const render = () => {
    const next = Boolean(context.state.finished);
    if (next === visible) return;
    visible = next;
    root.hidden = !next;
    root.dataset.visible = String(next);
    context.root.dataset.vegaEnding = next ? "true" : "false";
    if (next) {
      (buttons[0] ?? heading).focus({ preventScroll: true });
    }
  };
  const stop = startFrames(host, context.signal, render);
  render();

  return {
    dispose() {
      stop();
      delete context.root.dataset.vegaEnding;
      root.remove();
      style.remove();
    },
  };
};

export const createVegaEndingPlugin = (options: VegaEndingPluginOptions = {}): VegaPlugin =>
  defineVegaPlugin({
    manifest: {
      id: "haneoka.vega-ending",
      name: "Vega Ending",
      version: "0.1.0",
      apiVersion: 1,
      description: "Configurable story completion presentation",
      capabilities: ["ui-slot"],
    },
    setup(context) {
      context.contribute("ui-slot", {
        id: "ending",
        name: "Ending presentation",
        slot: "after-stage",
        mount: (host, slotContext) => mountEnding(host, slotContext, options),
      });
    },
  });

export const vegaEndingPlugin = createVegaEndingPlugin();

export default vegaEndingPlugin;
