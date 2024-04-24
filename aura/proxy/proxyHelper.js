({
    listener: null,
    callbacks: {},
    
    pluralTypeMap: {
        'dashboard': 'dashboards',
        'dataset': 'datasets',
        'folder': 'folders',
        'lens': 'lenses',
        'template': 'templates'
    },
    
    diagnosticAttributes: [
      	'ready',
        'ltngUrl',
      	'namespace',
        'vf_proxy_url',
      	'vf_origin_url',
        'uid'
    ],
    
    updateDiagnostics: function(component) {
        let self = this;
    	let diagnostics = component.get('v.diagnostics') || {
            source: 'c:proxy',
            attributes: {},
            errors: []
        };
        self.diagnosticAttributes.forEach(function(name) {
           	diagnostics.attributes[name] = component.get('v.' + name); 
        });
        component.set('v.diagnostics', diagnostics);
    },

    logDiagnosticError: function(component, error) {
        let self = this;
    	let diagnostics = component.get('v.diagnostics') || {
            source: 'c:proxy',
            attributes: {},
            errors: []
        };
        error.date = new Date().toUTCString();        
        diagnostics.errors.push(error);
        component.set('v.diagnostics', diagnostics);
    },
    
    setupMessageListener: function(component) {
        var self = this;
        var iframe = component.find('vf_proxy_frame').getElement();
        var vf_proxy = component.find("vf_proxy_frame").getElement();
        var vf_win = vf_proxy.contentWindow;
        var uid = component.get("v.uid");
        
        /*
         * TBD - Handle multiple proxies better!
         */
        
        /*
        if (self.listener !== null && typeof self.listener !== "undefined") {
            window.removeEventListener("message", self.listener);
        }
        */
        self.listener = function(event) {
            self.handleMessage(component, event);
        };       
        
        window.addEventListener("message", self.listener, false);
        
        var uid = Date.now() + '_' + Math.round(Math.random() * 100000000);
        component.set("v.uid", uid);
        
        var url = "";
		var ltngUrl = component.get("v.ltngUrl") || window.location.origin;
        
        var namespace = component.get('v.namespace');
        
		var url = ltngUrl + '/apex/';
        //url += (namespace !== null && typeof namespace !== 'undefined' && namespace.length > 0)  ? namespace + '/' : '';
        //url += '/';
        url += 'proxy?ltng_origin=' + window.location.origin + '&ltng_url=' + ltngUrl + '&ltng_uid=' + uid;
        
        //console.warn('url: ', url);
        
        var rep = (namespace !== null && typeof namespace !== 'undefined' && namespace.length > 0)  ? '--' + namespace : '';
        url = url.replace('.lightning.force', rep + '.visualforce');
        //console.warn('url: ', url);
        
		component.set('v.vf_proxy_url', url);
        
        self.updateDiagnostics(component);
    },
        
    handleMessage: function(component, event) {
        //console.warn('proxyHelper.handleMessage - event: ', event);
        if (event.data !== null && typeof event.data !== 'undefined') {            
            var data = null;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                //console.error("data: ', event.data, ' is not valid JSON");
            }
            //console.warn('proxyHelper.handleMessage - data: ', data);
            if (data) {
                var uid = component.get("v.uid");
                var vf_origin_url = component.get("v.vf_origin_url");
                var self = this;
                if (data.type === "ready" && data.uid === uid) {
                    var origin_url = event.origin;
                    component.set("v.vf_origin_url", origin_url);
                    component.set("v.ready", true);
                } else if (data.type === "response" && data.uid === uid && event.origin === vf_origin_url) {
                    var response = data.response;
                    if (response.config && response.config._callbackUID) {
                        var callback = self.callbacks[response.config._callbackUID];
                        if (typeof callback === 'function') {
                            callback(component, response);
                            if (response.config.preserveCallback !== true) {
                                delete self.callbacks[response.config._callbackUID];
                            }
                        }
                    }
                } else {
                }
            }
        }
    },
    
    sendMessage: function(component, type, config, callback) {
        //console.warn('proxyHelper.sendMessage: ', type, config);
        var origin_url = component.get("v.vf_origin_url");
        //console.warn('proxyHelper.sendMessage - origin_url: ', origin_url);
        var uid = component.get("v.uid");
        var self = this;
        if (typeof origin_url !== "undefined") {
            var vf_proxy = component.find("vf_proxy_frame").getElement();
            //console.warn('vf_proxy: ', vf_proxy);
            var vf_win = vf_proxy.contentWindow;
            //console.warn('vf_win: ', vf_win);
            if (typeof callback === 'function') {
                config._callbackUID = '_callback_' + Date.now();
                self.callbacks[config._callbackUID] = callback;
            }
            
            var json = JSON.stringify({type: type, uid: uid, config: config});
            //console.warn('proxyHelper.sendMessage - json: ', json);
            vf_win.postMessage(json, origin_url);
        }
    }
})