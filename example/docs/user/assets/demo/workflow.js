class NoteWorkflow {
  constructor(state = {revisions: [], approvedVersion: null}) { this.state = structuredClone(state); }
  get version() { return this.state.revisions.at(-1)?.version ?? 0; }
  get text() { return this.state.revisions.at(-1)?.text ?? ''; }
  save(text, expected) {
    if (expected !== this.version) throw Error('Stale revision: inspect the current saved text before retrying.');
    if (!text.trim()) throw Error('Enter nonempty draft text.');
    this.state.revisions.push({version: this.version + 1, text}); this.state.approvedVersion = null;
  }
  approve(expected) {
    if (!this.version || expected !== this.version) throw Error('Inspect and approve the current saved revision.');
    this.state.approvedVersion = this.version;
  }
}
globalThis.NoteWorkflow = NoteWorkflow;
