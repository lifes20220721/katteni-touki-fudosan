// Input structure only. Legal shares and eligibility remain in rules.js.
export function inspectHeirs(state) {
  const spouses = state.heirs.filter(person => person.relation === 'spouse');
  const children = state.heirs.filter(person => person.relation === 'child');
  return {
    spouses,
    children,
    hasOtherRelations: state.heirs.some(person => !['spouse', 'child'].includes(person.relation)),
    countsMatch: state.expectedSpouses === String(spouses.length)
      && state.expectedChildren === String(children.length),
    hasDuplicatePeople: state.heirs.some((person, index) => state.heirs.slice(0, index).some(previous =>
      previous.name.trim() === person.name.trim() && previous.birth === person.birth)),
  };
}
