// Script to check all Chrome storage keys
chrome.storage.local.get(null, (result) => {
  console.log('All storage keys:', Object.keys(result));
  console.log('\nFull storage data:');
  console.log(JSON.stringify(result, null, 2));
  
  // Check for todo templates specifically
  const todoTemplateKeys = Object.keys(result).filter(key => 
    key.includes('todo') || key.includes('template') || key.includes('Template')
  );
  console.log('\nTodo/Template related keys:', todoTemplateKeys);
  
  // Check for space-related keys
  const spaceKeys = Object.keys(result).filter(key => 
    key.includes('space') || key.includes('Space') || key.includes('widgets-')
  );
  console.log('\nSpace-related keys:', spaceKeys);
});
EOF < /dev/null
