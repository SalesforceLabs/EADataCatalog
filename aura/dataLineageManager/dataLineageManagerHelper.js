({
	OLD_getLineage: function(component, params) {
        let self = this;
        if (params) {
            let config = params.config;
            
            console.warn('dataLineageManager.getLineage - config: ', config);
            
            let assetManager = component.find('assetManager');
            assetManager.getAsset(config, $A.getCallback(function(err, asset) {
                if (err) {
                    console.warn('assetManager.getAsset error: ', err);
                    if (typeof params.callback === 'function') {
                        params.callback(err, null);
                    }
                } else if (asset) {
                    console.warn('dataLineageManager - asset: ', asset);
                    asset.type = asset.templateType ? 'template' : asset.type;
                    console.warn('asset.type: ', asset.type);
                    
                    try {
                        let methodName = 'get_' + asset.type + '_lineage';
                        self[methodName](component, asset, params.callback);
                    } catch (e) {
                        console.error('Exception: ', e);
                    }
                    
                } else {
                    if (typeof params.callback === 'function') {
                        params.callback({error: 'NO_ASSET_FOUND', msg: 'No asset found'});
                    }
                }
            }));
        }
	},

    // Resolve any existing parent-child relationships
    // REVISIT LATER?????
    resolveLineage: function(component, lineage) {
        
        return;
        
        console.warn('resolveLineage: ', lineage);
        let self = this;
        let lineageMap = component.get('v.lineageMap') || {};
        
        let check = null;
        let exists = false;
        for (var id in lineageMap) {
            check = lineageMap[id];
            console.warn('checking: ', check.id, check.type, check.name);
            if (check) {
                if (check.children) {
                    check.children.forEach(function(childId) {
                        if (childId === lineage.id) {
                            exists = false;
                            lineage.parents.forEach(function(parentId) {
                                if (parentId === childId) {
                                    exists = true;
                                } 
                            });
                            if (exists === false) {
                                lineage.parents.push(check.id);
                            }
                        }
                    });
                }
                if (check.parents) {
                    check.parents.forEach(function(parentId) {
                        if (parentId === lineage.id) {
                            exists = false;
                            lineage.children.forEach(function(childId) {
                                if (childId === parentId) {
                                    exists = true;
                                } 
                            });
                            if (exists === false) {
                                lineage.children.push(check.id);
                            }
                        }
                    });
                }
            }
        }

        lineageMap[lineage.id] = lineage;
        component.set('v.lineageMap', lineageMap);
    },

    getAsset: function(component, config, callback) {
        let self = this;
        let assetMap = component.get('v.assetMap') || {};
        //console.warn('assetMap: ', assetMap);
        let asset = assetMap[config.id];
        //console.warn('asset: ', asset);
        if (asset === null || typeof asset === 'undefined') {
            let assetManager = component.find('assetManager');            
            assetManager.getAsset(config, function(err, asset) {                
                if (err) {
                    if (typeof callback === 'function') {
                        callback(err, null);
                    }
                } else {
                    assetMap[config.id] = asset;
                    component.set('v.assetMap', assetMap);
                    if (typeof callback === 'function') {
                        callback(null, asset);
                    }
                }
            });
        } else {
            if (typeof callback === 'function') {
                callback(null, asset);
            }
        }
    },
    
    getLineage: function(component, config, callback) {
        let self = this;
        
        //console.warn('dataLineageManager.getLineage - config: ', config.id, config);
        
        
        // Try to get the lineage from the lineageMap
        let lineageMap = component.get('v.lineageMap') || {};
        //console.warn('lineageMap: ', lineageMap);
        let lineage = lineageMap[config.id];
        //console.warn('lineage: ', lineage);
        
        if (lineage !== null && typeof lineage !== 'undefined' && lineage.complete !== false) {
            //console.warn('calling resolveLineage: ', lineage);
            self.resolveLineage(component, lineage);
            if (typeof callback === 'function') {
                callback(null, lineage);
            }            
        } else {
            
            let assetManager = component.find('assetManager');
            //assetManager.getAsset(config, function(err, asset) {
            //console.warn('calling getAsset: ', config);
            self.getAsset(component, config, function(err, asset) {
                if (err) {
                    console.warn('assetManager.getAsset error: ', err);
                    if (typeof callback === 'function') {
                        callback(err, null);
                    }
                } else if (asset) {
                    //console.warn('dataLineageManager - asset: ', asset);
                    asset.type = asset.templateType ? 'template' : asset.type;
                    //console.warn('asset.type: ', asset.type);
                    
                    try {
                        let methodName = 'get_' + asset.type + '_lineage';
                        //console.warn('calling ', methodName);
                        self[methodName](component, asset, function(err, lineage) {
                            
                            lineage.complete = true;
                            
                            lineageMap = component.get('v.lineageMap') || {};
                            lineageMap[lineage.id] = lineage;
                            component.set('v.lineageMap', lineageMap);
                            
                            //console.warn('lineageMap: ', lineageMap);

                            self.resolveLineage(component, lineage);

                            if (typeof callback === 'function') {
                                callback(null, lineage);
                            }
                        });
                    } catch (e) {
                        console.error('Exception: ', e);
                        if (typeof callback === 'function') {
                            callback({error: 'EXCEPTION', msg: 'Runtime exception', exception: e});
                        }
                    }
                    
                } else {
                    if (typeof callback === 'function') {
                        callback({error: 'NO_ASSET_FOUND', msg: 'No asset found'}, null);
                    }
                }
            });
        }
	},
    
    get_folder_lineage: function(component, folder, callback) {
        let self = this;
        //console.warn('get_folder_lineage: ', folder);

        let lineageMap = component.get('v.lineageMap') || {};
        let breadcrumbMap = component.get('v.breadcrumbMap') || {};
        
        let lineage = {
            id: folder.id,
            type: 'folder_lineage',
            label: folder.label || folder.name,
            dashboard: folder,
            parents: [],
            children: []
        };
        
        let breadcrumb = null;
        let breadcrumbs = [];
        
        let folderBreadcrumb = {
            id: folder.id,
            type: 'folder',
            label: folder.label
        };
        
        breadcrumbMap[folder.id] = [folderBreadcrumb];
        
        let assetMap = component.get('v.assetMap') || {};
        //console.warn('assetMap: ', assetMap);
        
        let assetItemMap = component.get('v.assetItemMap') || {};
        //console.warn('assetItemMap: ', assetItemMap);        
        
        let asset = null;
        let assetLineage = null;
        
        for (var id in assetItemMap) {
            try {
                asset = assetItemMap[id].asset;
	            //console.warn(id, asset);
                if (asset.folder && asset.folder.id === folder.id) {
                    //console.warn('folder match for asset: ', JSON.parse(JSON.stringify(asset)));
                    
                    // Get the assetLineage if it exists
                    assetLineage = lineageMap[asset.id];
                    
                    // Create a new one if it does not exist
                    // 
                    // Note the complete flag is set to false to indicate full lineage has not been found!
                    // 
                    if (assetLineage === null || typeof assetLineage === 'undefined') {
                        assetLineage = {
                            id: asset.id,
                            type: asset.type,
                            label: asset.label || asset.name,
                            parents: [],
                            children: [],
                            complete: false
                        };
                        
                        // Set the asset field
                        assetLineage[asset.type] = asset;
                    };
                    
                    breadcrumbs = [];
                    
                    breadcrumb = {
                        id: asset.id,
                        type: asset.type,
                        label: asset.label
                    };
                    
                    breadcrumbs.push(folderBreadcrumb);
                    breadcrumbs.push(breadcrumb);
                    
                    breadcrumbMap[asset.id] = breadcrumbs;
                    
					//breadcrumbs.push(breadcrumb);
                    
                    // Add the folder as parent
                    assetLineage.parents.push(folder.id);
                    
                    // Update the lineageMap
                    lineageMap[assetLineage.id] = assetLineage;
                    component.set('v.lineageMap', lineageMap);
                    
                    // Add the child to the lineage
                    lineage.children.push(asset.id);
                }
                
            } catch (e) {
                console.error('Exception: ', e);
            }           	
        }

        lineage.complete = true;
        
        if (typeof callback === 'function') {
            
            component.set('v.breadcrumbMap', breadcrumbMap);
            
            callback(null, lineage);
        }
    },
    
    
    get_dashboard_lineage: function(component, dashboard, callback) {
        let self = this;
        console.warn('get_dashboard_lineage: ', dashboard);

        let lineage = {
            id: dashboard.id,
            type: 'dashboard',
            label: dashboard.label || dashboard.name,
            dashboard: dashboard,
            parents: [],
            children: []
        };

        let breadcrumbMap = component.get('v.breadcrumbMap') || {};
        
        let breadcrumb = null;
        let breadcrumbs = [];
        
        breadcrumb = {
            id: dashboard.folder.id,
            type: 'folder',
            label: dashboard.folder.label
        };
        breadcrumbs.push(breadcrumb);

        breadcrumb = {
            id: dashboard.id,
            type: 'dashboard',
            label: dashboard.label
        };
        breadcrumbs.push(breadcrumb);
        

        
        self.getLineage(component, {type: 'folder', id: dashboard.folder.id}, function(err, folderLineage) {
    		
            lineage.parents = lineage.parents || [];            
            lineage.parents.push(folderLineage.id);

            
            if (dashboard.datasets && dashboard.datasets.length > 0) {
                lineage.children = [];
                let count = dashboard.datasets.length;
                dashboard.datasets.forEach(function(dataset) {
                    console.warn('dataset: ', dataset);
                    

                    //console.warn('getting lineage for dataset: ', dataset);
                    self.getLineage(component, {type: 'dataset', id: dataset.id}, function(err, datasetLineage) {
                        console.warn('dataset lineage: ', datasetLineage);
                        lineage.children.push(datasetLineage.id);
                        
                        count--;
                        if (count === 0) {
                            
                            lineage.breadcrumbs = breadcrumbs;
                            
                            breadcrumbMap[dashboard.id] = breadcrumbs;
                            
                            component.set('v.breadcrumbMap', breadcrumbMap);
                            
                            if (typeof callback === 'function') {
                                callback(null, lineage);
                            }
                        }
                    });
                });
                
            } else {
                if (typeof callback === 'function') {
                    callback(null, lineage);
                }
            }
        });
    },

    
    get_dataset_lineage: function(component, dataset, callback) {
        let self = this;
        //console.warn('get_dataset_lineage: ', dataset);
        
        let lineage = {
            id: dataset.id,
            type: 'dataset',
            label: dataset.label || dataset.name,
            dataset: dataset,
            parents: [],
            children: []
        };

        self.getLineage(component, {type: 'folder', id: dataset.folder.id}, function(err, folderLineage) {
    		
            lineage.parents = lineage.parents || [];            
            lineage.parents.push(folderLineage.id);

            let assetManager = component.find('assetManager');
            assetManager.getDatasetDetails(dataset, function(err, datasetDetails) {
                //console.warn('getDatasetDetails returned: ', datasetDetails);
                lineage.datasetDetails = datasetDetails;
                
                self.determineDatasetSource(component, dataset, datasetDetails, function(err, datasetSource) {
                    //console.warn('determineDatasetSource returned: ', err, datasetSource);
                    lineage.datasetSource = datasetSource;
                    
                    
                    if (err) {
                        
                    } else {
                        
                        let replicatedDataset = datasetSource.replicatedDataset || null;
                        let replicatedDatasetFields = replicatedDataset ? replicatedDataset.fields : null;
                        let replicatedDatasetFieldMap = {};
                        if (replicatedDatasetFields) {
                            replicatedDatasetFields.forEach(function(field) {
                                replicatedDatasetFieldMap[field.name] = field;
                            });
                        }
                        
                        let recipeDetails = datasetSource.recipeDetails || null;
                        let recipe = recipeDetails ? recipeDetails.recipe : null;
                        let recipeFile = recipeDetails ? recipeDetails.recipeFile : null;
                        let recipeLineage = recipeDetails ? recipeDetails.lineage : null;
                        let recipeLineageFieldMap = {};
                        if (recipeLineage) {
                            recipeLineage.forEach(function(l) {
                                recipeLineageFieldMap[l.field] = l;
                            });
                        }
                        
                        let fieldList = datasetDetails.fieldList;
                        let fieldAsset = null;
                        let replicatedField = null;
                        let recipeField = null;
                        let fieldLineage = null;
                        let fieldLineageList = [];
                        
                        let tokens = null;
                        let objectName = null;
                        let relatedObjectName = null;
                        let relatedFieldName = null;
                        let relatedField = null;
                        let relatedDataset = null;
                        let relatedFullyQualifiedName = null;
                        
                        fieldList.forEach(function(field, idx) {
                            //console.warn('field: ', field);
                            fieldLineage = [];

                            fieldLineage.push({
                                id: dataset.id + '_' + field.name,
                                type: 'dataset_field',
                                label: field.label || field.name || field.field,
                                dataset_field: field
                            });
                            
                            // Checking for related fields
                            // Note that this is not likely to be perfect!!!!!
                            //console.warn('checking for related fields: ', field.fullyQualifiedName);
                            tokens = field.fullyQualifiedName.split('.');
                            if (tokens.length > 2 || field.field.indexOf('Id') > 0) {
                                //console.warn('######################### LIKELY A RELATED FIELD: ', field.fullyQualifiedName + ' has ' + tokens.length + 'parts');
                                
                                
                                objectName = tokens[0];
                                
                                if (tokens.length === 2) {
                                    relatedObjectName = field.field.replace('Id', '');
                                    relatedFieldName = 'Id';
                                    
                                } else {
                                    relatedObjectName = tokens[1].replace('Id', '');
                                    relatedFieldName = tokens[2];
                                }
                                
                                replicatedField = replicatedDatasetFieldMap[relatedFieldName];
                              
                                recipeField = recipeLineageFieldMap[relatedFieldName];
                                
                                //console.warn('recipeField: ', recipeField);
                                //console.warn('replicatedField: ', replicatedField);

                                relatedField = {
                                    field: relatedFieldName,
                                    fullyQualifiedName: relatedObjectName + '.' + relatedFieldName,
                                    hasLabel: field.hasLabel,
                                    label: field.label,
                                    name: relatedFieldName,
                                    selected: true,
                                    type: field.type                          
                                };
                                
                                relatedDataset = {
                                    name: relatedObjectName,
                                    sourceObjectName: relatedObjectName,
                                    label: relatedObjectName,
                                    type: 'relateddataset'
                                };
                                
                                
                                if (replicatedField) {
                                    
                                    // Manually assign the label
                                    replicatedField.label = replicatedField.name;  
                                    
                                    if (replicatedDataset.connector) {
                                        fieldLineage.push({
                                            //id: replicatedField + '_' + replicatedDataset.connector.id,
                                            id: dataset.id + '_' + field.fullyQualifiedName + '_' + replicatedDataset.connector.id,
                                            type: 'replicated_dataset_connector',
                                            label: replicatedDataset.connector.label || replicatedDataset.connector.name,
                                            replicated_dataset_connector: JSON.parse(JSON.stringify(replicatedDataset.connector)) //replicatedDataset.connector
                                        });
                                    }
                                } else if (recipeField) {
                                    fieldLineage.push({
                                        id: recipe.id,
                                        type: 'recipe',
                                        label: recipe.label || recipe.name,
                                        recipe: recipe
                                    });                                
                                } else {
                                    if (datasetDetails.xmd.dataset && datasetDetails.xmd.dataset.connector) {
                                        fieldLineage.push({
                                            //id: dataset.id + '_' + datasetDetails.xmd.dataset.connector,
                                            id: dataset.id + '_' + datasetDetails.xmd.dataset.connector + '_' + relatedField.fullyQualifiedName,
                                            type: 'dataset_connector',
                                            label: datasetDetails.xmd.dataset.connector,
                                            dataset_connector: {
                                                connectorType: datasetDetails.xmd.dataset.connector,
                                                name: dataset.id + '_' + datasetDetails.xmd.dataset.connector,
                                                label: datasetDetails.xmd.dataset.connector
                                            }                                            
                                        });
                                    }
                                }
                                
                                fieldLineage.push({
                                    id: relatedDataset.name + '_' + relatedField.fullyQualifiedName,
                                    type: 'related_dataset_field',
                                    label: relatedField.name,
                                    related_dataset_field: relatedField
                                });
                                
                                fieldLineage.push({
                                    id: relatedDataset.name,
                                    type: 'related_dataset',
                                    label: relatedDataset.label || relatedDataset.name,
                                    related_dataset: relatedDataset
                                });
                                
                            } else {
                                
                                replicatedField = replicatedDatasetFieldMap[field.field];
                                
                                recipeField = recipeLineageFieldMap[field.field];
                                
                                //console.warn('recipeField: ', recipeField);
                                //console.warn('replicatedField: ', replicatedField);
                                
                                
                                if (!recipeField && !replicatedField) {
                                    //console.warn('CSV?');
                                    //console.warn('datasetDetails: ', datasetDetails);
                                    // Most likely a CSV? Other?
                                    // Note that the "type" for these are artificial as the values are string
                                    if (datasetDetails.xmd.dataset && datasetDetails.xmd.dataset.connector) {
                                        fieldLineage.push({
                                            id: dataset.id + '_' + datasetDetails.xmd.dataset.connector + '_' + field.name + '_connector',
                                            type: 'dataset_connector',
                                            label: datasetDetails.xmd.dataset.connector,
                                            dataset_connector: {
                                                connector: datasetDetails.xmd.dataset.connector,
                                                name: dataset.id + '_' + datasetDetails.xmd.dataset.connector,
                                                label: dataset.id + '_' + datasetDetails.xmd.dataset.connector
                                            }
                                        });
                                        
                                        fieldLineage.push({
                                            id: dataset.id + '_' + datasetDetails.xmd.dataset.connector + '_' + field.name,
                                            type: 'origin_field',
                                            label: field.name,
                                            origin_field: field
                                        });                                        
                                        
                                        fieldLineage.push({
                                            id: dataset.id + '_' + datasetDetails.xmd.dataset.connector + '_' + datasetDetails.xmd.dataset.fullyQualifiedName,
                                            type: 'datasource',
                                            label: datasetDetails.xmd.dataset.fullyQualifiedName,
                                            datasource: {
                                                id: dataset.id + '_' + datasetDetails.xmd.dataset.fullyQualifiedName,
                                                name: datasetDetails.xmd.dataset.fullyQualifiedName,
                                                label: datasetDetails.xmd.dataset.fullyQualifiedName
                                            }
                                        });
                                    }
                                    
                                } else {
                                    
                                    if (recipeField) {
                                        
                                        fieldLineage.push({
                                            id: recipe.id + '_recipe_' + recipeField.field,
                                            type: 'recipe',
                                            label: recipe.label || recipe.name,
                                            recipe: recipe
                                        });
                                        fieldLineage.push({
                                            id: recipe.id + '_' + recipeField.field,
                                            type: 'recipe_field',
                                            label: recipeField.field,
                                            recipe_field: recipeField
                                        });
                                        if (recipeField.dataset) {
                                            fieldLineage.push({
                                                id: recipe.id + '_' + recipeField.field + '_' + recipeField.dataset.name,
                                                type: 'recipe_source_dataset',
                                                label: recipeField.dataset.label || recipeField.datset.name,
                                                recipe_source_dataset: recipeField.dataset
                                            });
                                        }
                                    }
                                    
                                    if (replicatedField) {
                                        
		                                // Manually assign the label
                                        replicatedField.label = replicatedField.name;
                                        
                                        if (replicatedDataset.connector) {
                                            
                                            fieldLineage.push({
                                                id: replicatedDataset.id + '_' + replicatedField.name + '_' + replicatedDataset.connector.id,
                                                type: 'replicated_dataset_connector',
                                                label: replicatedDataset.connector.label || replicatedDataset.connector.name,
                                                replicated_dataset_connector: JSON.parse(JSON.stringify(replicatedDataset.connector)) //replicatedDataset.connector
                                            });
                                        }
                                        
                                        fieldLineage.push({
                                            id: replicatedDataset.id + '_' + replicatedField.name,
                                            type: 'replicated_dataset_field',
                                            label: replicatedField.name,
                                            replicated_dataset_field: replicatedField
                                        });
                                        
                                        fieldLineage.push({
                                            id: replicatedDataset.id,
                                            type: 'replicated_dataset',
                                            label: replicatedDataset.label || replicatedDataset.name,
                                            replicated_dataset: replicatedDataset
                                        });
                                        
                                        
                                    }
                                }
                            }
                            
                            //console.warn('fieldLineage: ', JSON.parse(JSON.stringify(fieldLineage)));
                            
                            fieldLineageList.push(fieldLineage);
                            
                        });
                        
                        //console.warn('fieldLineageList: ', fieldLineageList);

                        
                        let lineageMap = component.get('v.lineageMap') || {};
						let assetMap = component.get('v.assetMap') || {};                        
                        let breadcrumbMap = component.get('v.breadcrumbMap') || {};

                        let node = null;
                        let child = null;
                        let id = null;
                        
                        fieldLineageList.forEach(function(fieldLineage) {
                            //console.warn('fieldLineage: ', fieldLineage);
                            node = lineage;
                            //console.warn('node: ', node);
                            node.children = node.children || [];
                            
                            fieldLineage.forEach(function(l) {
                                
                                if (l.id === null || typeof l.id === 'undefined') {
                                    console.error('NO ID - l: ', l);
                                }
                                
                               	id = l.id; // || (node.id + '_' + l.type + '_' + (l.name || l.label));
                                
                                child = lineageMap[l.id];
                                
                                if (child === null || typeof child === 'undefined') {
                                    //child = l;
                                    
                                    child = {};
                                    Object.assign(child, l[l.type]);
                                    child.type = l.type;
                                    
                                    child.id  = l.id;
                                    
                                    lineageMap[child.id] = child;
                                    assetMap[child.id] = child;
                                }


                                // Brute force
                               	let match = false;
                                node.children.forEach(function(id) {
                                    if (id === child.id) {
                                        match = true;
                                    }
                                });
                                
                                if (match === false) {
	                              	node.children.push(child.id);                                
                                }
                                
                                child.children = [];
                                child.parents = child.parents || [];
                                child.parents.push(node.id);

                                node = child;
                                
                              
                            });
                        });
                        

                        lineage.fieldLineageList = fieldLineageList;
                        
						// Create the breadcrumbs                        
                        if (lineage.fieldLineageList && lineage.fieldLineageList.length > 0) {
                            
                            let folderBreadcrumb = {
                                id: dataset.folder.id,
                                type: 'folder',
                                label: dataset.folder.label
                            };
                            
                            let datasetBreadcrumb = {
                                id: lineage.id,
                                type: lineage.type,
                                label: lineage.label
                            };
                            
                            let datasetBreadcrumbs = [];
                            
                            //datasetBreadcrumbs.push(folderBreadcrumb);
                            //datasetBreadcrumbs.push(datasetBreadcrumb);
                            

                            let breadcrumbs = null;
                            let breadcrumb = null;
                        
                            lineage.fieldLineageList.forEach(function(fieldLineage) {
                                breadcrumbs = [];
                                breadcrumbs.push(folderBreadcrumb);
                                breadcrumbs.push(datasetBreadcrumb);
                                
                                fieldLineage.forEach(function(l) {
                                    breadcrumb = {
                                        id: l.id,
                                        type: l.type,
                                        label: l.label
                                    };
                                    breadcrumbs.push(breadcrumb);
                                    l.breadcrumbs = breadcrumbs;
                                    breadcrumbMap[l.id] = breadcrumbs;
                                });
                                
                                fieldLineage.breadcrumbs = breadcrumbs;
                                datasetBreadcrumbs.push(breadcrumbs);
                            });
                            
                            lineage.breadcrumbs = datasetBreadcrumbs;
                            breadcrumbMap[lineage.id] = [folderBreadcrumb, datasetBreadcrumb];
                         }
                        
                        component.set('v.lineageMap', lineageMap);
                        component.set('v.assetMap', assetMap);
                        component.set('v.breadcrumbMap', breadcrumbMap);

                        
                        console.warn('*********************************************************');
                        

                        if (typeof callback === 'function') {
                            callback(null, lineage);
                        }                                        
                    }                
                });

            });
            
        });
        
    },
        
    getRecipeLineage: function(component, recipe, recipeFile, callback) {
        let self = this;
        console.warn('getRecipeLineage: ', recipe, recipeFile);
        
        let assetManager = component.find('assetManager');
        
        let datasets = {};        
        let tableModelInfo = recipeFile.tableModelInfo;
        let rootDataset = tableModelInfo.rootDataset;
        datasets[rootDataset.qualifier] = rootDataset;        
        
        let steps = recipeFile.steps;
        steps.forEach(function(step) {
            if (step.dataset) {
                console.warn('step.dataset: ', step.dataset);
                datasets[step.dataset.qualifier] = step.dataset;
                /*
                self.get_dataset_lineage(component, step.dataset, function(err, dataetLinage) {
                 	step.dataset.lineage = lineage;
                });
                */
            }
        });
        
        //console.warn('datasets: ', datasets);
        
    	let publishFields = recipeFile.publishFields;
        let tokens = null;
        let qualifier = null;
        let fieldName = null;
        let dataset = null;
        let lineage = [];
        let item = null;
        let datasetIds = {};
        publishFields.forEach(function(publishField) {
            //console.warn('publishField.name: ', publishField.name);
            tokens = publishField.name.split('$');
           	qualifier = tokens[0];
            fieldName = tokens[1];
            
            //console.warn('qualifier: ', qualifier, ' - fieldName: ', fieldName);

            dataset = datasets[qualifier];

            //console.warn('dataset: ', dataset);
            if (dataset) {
                datasetIds[dataset.name] = dataset;
            }
            
            item = {
                field: (rootDataset.qualifier !== qualifier ? qualifier + '.' : '' ) + fieldName,
                dataset: dataset
            }
            
            lineage.push(item);
            
        });

        // How to best get the dataset/dataset details?
/*
       	let counter = 0;
        for (var id in datasetIds) {
            counter++;
            console.warn('>>>>>>>>>>>>>>>>>>>>>> calling assetManager.getDataset: ', id);
            assetManager.getDataset(id, function(err, dset) {
                counter--;
                console.warn('>>>>>>>>>>>>>>>>>>>>>> dset: ', dset);
                console.warn('>>>>>>>>>>>>>>>>>>>>>> counter: ', counter);
                if (counter === 0) {
                    console.warn('************************************* DONE *****************************');

                    linege.forEach(function(l) {
                      	 
                    });
                    if (typeof callback === 'function') {
                        callback(null, lineage);
                    }

                }
            });
        }
*/
        
        if (typeof callback === 'function') {
            callback(null, lineage);
        }
        
    },
    
    getRecipeDetails: function(component, dataset, callback) {
        let self = this;
        let assetManager = component.find('assetManager'); 
        
        assetManager.listRecipes(function(err, recipes) {
            let recipe = null;
            recipes.forEach(function(r) {
                if (r.dataset && (r.dataset.id === dataset.id)) {
                    recipe = r;
                }
            });
        
            if (recipe) {
                assetManager.getRecipeFile(recipe.fileUrl, function(err, file) {
                    //console.warn('getRecipeFile returned: ', err, file);
                    if (err) {
                        if (typeof callback === 'function') {
                            callback({err: 'NO_RECIPE_FILE', msg: 'No recipe file'}, null);
                        }                    
                    } else {
                        self.getRecipeLineage(component, recipe, file, function(err, lineage) {
                            //console.warn('getRecipeLineage returned: ', err, lineage);
                            if (err) {
                                if (typeof callback === 'function') {
                                    callback({err: 'NO_RECIPE_FILE', msg: 'No recipe file'}, null);
                                }
                            } else {
                                let recipeDetails = {
                                    recipe: recipe,
                                    recipeFile: file,
                                    lineage: lineage
                                };
                                if (typeof callback === 'function') {
                                    callback(null, recipeDetails);
                                }                    
                            }
                        });
                    }
                });
                
            } else {
                if (typeof callback === 'function') {
                    callback({err: 'NO_RECIPE', msg: 'No recipe'}, null);
                }
            }
        });
    },
    
    getReplicatedDataset: function(component, dataset, datasetDetails, callback) {
        let self = this;
        let fullyQualifiedName = datasetDetails.xmd.dataset.fullyQualifiedName;
        let assetManager = component.find('assetManager'); 
        
        assetManager.listReplicatedDatasets(function(err, replicatedDatasets) {            
            if (replicatedDatasets) {
                let replicatedDataset = null;
                replicatedDatasets.forEach(function(r) {
                    if (r.name === fullyQualifiedName) {
                        replicatedDataset = r;
                    }
                });
                if (replicatedDataset) {
                    //console.warn('replicatedDataset match: ', replicatedDataset);
                    assetManager.getReplicatedDatasetFields(replicatedDataset.fieldsUrl, function(err, fields) {
                        let datasetSource = replicatedDataset;
                        datasetSource.fields = fields;
                        
                        if (typeof callback === 'function') {
                            callback(null, datasetSource);
                        }
                        
                    });
                    
                } else {
                    if (typeof callback === 'function') {
                        callback({err: 'NO_REPLICATED_DATASET', msg: 'No replicated dataset'}, null);
                    }
                }
            } else {
                    if (typeof callback === 'function') {
                        callback({err: 'NO_REPLICATED_DATASETS', msg: 'No replicated datasets'}, null);
                    }                
            }
        });        
    },

    determineDatasetSource: function(component, dataset, datasetDetails, callback) {
        let self = this;
        try {
            self.getRecipeDetails(component, dataset, function(err, recipeDetails) {
                
                //console.warn('getRecipeDetails returned: ', err, recipeDetails);
                
                self.getReplicatedDataset(component, dataset, datasetDetails, function(err, replicatedDataset) {

                	//console.warn('getReplicatedDataset returned: ', err, replicatedDataset);
                    
                    let datasetSource = {
                        datasetId: dataset.id,
                        recipeDetails: recipeDetails,
                        replicatedDataset: replicatedDataset
                    };
                    
                    if (typeof callback === 'function') {
                        callback(null, datasetSource);
                    }
                    
                });
            });
        } catch (e) {
            console.error('Exception: ', e);
            if (typeof callback === 'function') {
                callback(e, null);
            }            
        }
    }

})