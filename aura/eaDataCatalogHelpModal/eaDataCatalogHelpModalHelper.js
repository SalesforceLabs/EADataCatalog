({
	createDiagnosticsReport: function(component) {
		let diagnostics = component.get('v.diagnostics');
		let report = JSON.stringify(diagnostics, null, 2);
        component.set('v.report', report);
	}
})