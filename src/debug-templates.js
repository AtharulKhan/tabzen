// Debug script to check template storage
async function debugTemplates() {
  console.log('=== Debug Template Storage ===');
  
  // Check Chrome storage directly
  const chromeResult = await chrome.storage.local.get(['todoTemplates', 'dashboardTemplates', 'widgets']);
  
  console.log('Chrome Storage Contents:');
  console.log('todoTemplates:', chromeResult.todoTemplates);
  console.log('dashboardTemplates:', chromeResult.dashboardTemplates);
  
  // Check all widgets for templates
  const widgets = chromeResult.widgets || {};
  console.log('\nChecking widgets for templates:');
  
  for (const [widgetId, widgetData] of Object.entries(widgets)) {
    if (widgetId.startsWith('todo-') && widgetData.templates) {
      console.log(`Widget ${widgetId} has ${widgetData.templates.length} templates:`, widgetData.templates);
    }
  }
  
  // Check spaces
  const spacesResult = await chrome.storage.local.get('spaces');
  const spaces = spacesResult.spaces || [];
  
  console.log('\nChecking spaces for todo widgets:');
  for (const space of spaces) {
    const spaceKey = `space_${space.id}_widgets`;
    const spaceResult = await chrome.storage.local.get(spaceKey);
    const spaceWidgets = spaceResult[spaceKey] || {};
    
    for (const [widgetId, widgetData] of Object.entries(spaceWidgets)) {
      if (widgetId.startsWith('todo-') && widgetData.templates) {
        console.log(`Space ${space.name} - Widget ${widgetId} has ${widgetData.templates.length} templates:`, widgetData.templates);
      }
    }
  }
  
  return {
    todoTemplates: chromeResult.todoTemplates,
    dashboardTemplates: chromeResult.dashboardTemplates,
    widgets: widgets,
    spaces: spaces
  };
}

// Run the debug function
debugTemplates().then(result => {
  console.log('\n=== Summary ===');
  console.log('Total standalone todo templates:', result.todoTemplates?.length || 0);
  console.log('Total dashboard templates:', result.dashboardTemplates?.length || 0);
  window.debugTemplateResult = result;
});