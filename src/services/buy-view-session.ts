/** One active operation and one polling timer per Buy view. */
export class BuyViewSession {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private busy = false;
  private readonly owner: string;
  private readonly active: () => boolean;
  private readonly getOwner: () => string;
  constructor(active: () => boolean, getOwner: () => string) {
    this.active = active; this.getOwner = getOwner; this.owner = getOwner();
  }
  stop() { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }
  check() {
    if (!this.active()) { this.stop(); throw new Error('Buy view is no longer active.'); }
    if (this.getOwner() !== this.owner) { this.stop(); throw new Error('Wallet or network changed. Reopen Buy cNGN.'); }
  }
  async run(action: () => Promise<void>, onError: (error: unknown) => void) {
    if (this.busy || !this.active()) return;
    this.busy = true; this.stop();
    try { this.check(); await action(); this.check(); }
    catch (error) { if (this.active()) onError(error); }
    finally { this.busy = false; }
  }
  poll(action: () => Promise<void>, delay: number, onError: (error: unknown) => void) {
    this.stop();
    this.timer = setTimeout(() => { this.timer = undefined; void this.run(action, onError); }, delay);
  }
}
