export function selectArtifacts(config, only = [], {includeEvidence=false,includeScreenshots=false}={}) {
  const artifacts=[...config.artifacts,...(includeEvidence?config.evidence:[]),...(includeScreenshots?config.screenshots:[])];
  const known=[...config.artifacts,...config.evidence,...config.screenshots];
  for(const id of only) if(!known.some(a=>a.id===id)) throw new Error(`unknown artifact id: ${id}`);
  const ordered=[],visited=new Set(),active=new Set();
  function visit(artifact) {
    if(active.has(artifact.id)) throw new Error(`artifact dependency cycle: ${artifact.id}`);
    if(visited.has(artifact.id)) return;
    active.add(artifact.id);
    for(const id of artifact.dependsOn??[]) {
      const dependency=known.find(a=>a.id===id);
      if(!dependency) throw new Error(`${artifact.id}: unknown dependency ${id}`);
      visit(dependency);
    }
    active.delete(artifact.id);visited.add(artifact.id);ordered.push(artifact);
  }
  for(const artifact of artifacts.filter(a=>!only.length || only.includes(a.id))) visit(artifact);
  return ordered;
}
