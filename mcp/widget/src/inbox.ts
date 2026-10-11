import { PostMessageTransport } from '@modelcontextprotocol/ext-apps';
import type { LoaderInbox } from '../../shared/loader.ts';

export function replay(events: readonly MessageEvent[], target: Window = window): void {
  for (const { data, origin, source } of events) {
    target.dispatchEvent(new MessageEvent('message', { data, origin, source }));
  }
}

export class InboxTransport extends PostMessageTransport {
  readonly #inbox: LoaderInbox | undefined;

  constructor(inbox: LoaderInbox | undefined, host: Window = window.parent) {
    super(host, host);
    this.#inbox = inbox;
  }

  override async start(): Promise<void> {
    await super.start();
    replay(this.#inbox?.take() ?? []);
  }
}
