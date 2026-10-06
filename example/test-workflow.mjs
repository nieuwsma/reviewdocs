import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import './docs/user/assets/demo/workflow.js';
const note=new globalThis.NoteWorkflow();note.save('Review the draft',0);note.approve(1);assert.equal(note.state.approvedVersion,1);note.save('Review the draft with the editor',1);assert.equal(note.state.approvedVersion,null);assert.equal(note.state.revisions[0].text,'Review the draft');assert.throws(()=>note.save('stale',1),/Stale revision/);assert.equal(note.version,2);
if(process.env.REVIEWDOCS_RUN_DIR)writeFileSync(process.env.REVIEWDOCS_RUN_DIR+'/result.json',JSON.stringify({tests:1,passed:1,failed:0,skipped:0}));
console.log('Passed synthetic workflow assertions; no browser or deployment proof.');
