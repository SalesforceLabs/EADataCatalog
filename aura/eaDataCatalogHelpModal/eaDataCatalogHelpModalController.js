({
	init: function(component, event, helper) {
        helper.createDiagnosticsReport(component);
	},
    
    handleCopyToClipboard: function(component, event, helper) {
        try {
            let report = component.get('v.report');
            let noformatting = JSON.stringify(JSON.parse(report));
            let tmp = document.createElement('input');
            tmp.setAttribute('type', 'text');
            tmp.setAttribute('value', noformatting);          
            document.body.appendChild(tmp);
            tmp.select();
            tmp.setSelectionRange(0, 9999999);
            console.warn('tmp: ', tmp);
            document.execCommand('copy');
            console.warn('tmp: ', tmp);
            document.body.removeChild(tmp);
        } catch (e) {
            console.error('Exception: ', e);
        }
    }
    
})