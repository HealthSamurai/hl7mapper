const doMapping = (scope) => {
  return {
    resourceType: "Encounter",
    foo: scope.PV1['19'],
    period: {
      start: scope.pv1['44'],
      end: scope.pv1['45']
    }
  };
};

module.exports = { doMapping };
