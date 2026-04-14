export type RealtimeEvent = {
  seq: number;
  type:
    | "order.updated"
    | "fill.created"
    | "run.updated"
    | "account.updated"
    | "risk.triggered"
    | "snapshot"
    | "dashboard.updated"
    | "heartbeat";
  ts: string;
  data: Record<string, unknown>;
};

type Listener = (event: RealtimeEvent) => void;

export class EventHub {
  #listeners = new Set<Listener>();
  #sequence = 0;

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  nextSequence(): number {
    this.#sequence += 1;
    return this.#sequence;
  }

  publish(event: Omit<RealtimeEvent, "seq">): RealtimeEvent {
    const eventWithSeq: RealtimeEvent = {
      ...event,
      seq: this.nextSequence(),
    };

    for (const listener of this.#listeners) {
      listener(eventWithSeq);
    }
    return eventWithSeq;
  }
}
