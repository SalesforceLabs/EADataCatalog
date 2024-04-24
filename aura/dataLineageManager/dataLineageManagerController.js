({
	getLineage: function(component, event, helper) {
        let params = event.getParam('arguments');
        let config = params.config;
        let callback = params.callback;
        
        helper.getLineage(component, config, callback);
	}
})