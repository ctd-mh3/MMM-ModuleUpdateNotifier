# MMM-ModuleUpdateNotifier

This a module for <strong>MagicMirror²</strong><br>
https://magicmirror.builders/<br>


This module uses https://github.com/dathbe/MMM-CustomText to provide a message on the MagicMirror if there are MagicMirror module updates available to be installed.  

After developing this module, the developer discovered that the default updatenotification module of MagicMirror has similar functionality when the useModulesFromConfig option is set to `false`.  So it is doubtful is anyone needs to use this module.  

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/ctd-mh3/MMM-ModuleUpdateNotifier
git clone https://github.com/dathbe/MMM-CustomText
sudo mv ./MMM-ModuleUpdateNotifier/check_for_module_updates.sh /usr/local/bin/.
```
In /usr/local/bin/check_for_module_updates.sh, update MM_MODULES_DIR to the directory of your MagicMirror base modules directory.

### MagicMirror² Configuration

To use this module, add needed configuration information to `~/MagicMirror/config/config.js` file.  Example is below:
```js
var config = {
    modules: [
    
    	{
  			module: "MMM-CustomText",
 	 		// Place where you want this message
 	 		position: "top_bar",  
  			config: {
			    // Must ensure this uniqueID matches default ("moduleUpdateNotifier") in MMM-ModuleUpdateNotifier.js or value passed in MMM-ModuleUpdateNotifier portion of config.js
    			uniqueID: "moduleUpdateNotifier", 
  			}
		},
        ...
		{
  			module: "MMM-ModuleUpdateNotifier",
  			position: "bottom_bar", // module's own UI is minimal; position isn't important
		},
        ...
    ]
}
```

### Configuration options

The following properties can be configured:

| Option                | Description
|-----------------------|------------
|`command`	|*Optional* The shell script including full path which will output information on module updates available.<br><br>**Type:** `string`<br>**Default:** `"/usr/local/bin/check_for_module_updates.sh"`
|`checkIntervalMS`	|*Optional* Interval (in milliseconds) for how often to run the above command to check for apt updates<br><br>**Type:** `int`<br>**Default:** `43200000` (12 hr)
|`customTextUniqueID`	|*Optional* uniqueID for MMM-CustomText field to place results-<br><br>**Type:** `string`<br>**Default:** `"moduleUpdateNotifier"`
|`showCounts`	|*Optional* Include the # of commits behing in the outputted notification-<br><br>**Type:** `boolean`<br>**Default:** `true`
|`maxNames`	|*Optional* Maximum modules to list before truncating-<br><br>**Type:** `int`<br>**Default:** `6`


### Sample Configuration

Below is a bare minimum example of relevant parts of a `config/config.js` file:
```
		{
  			module: "MMM-CustomText",
 	 		// Place where you want this message
 	 		position: "top_bar",
  			config: {
			    // Required uniqueID for MMM-ModuleUpdateNotifier
    			uniqueID: "moduleUpdateNotifier", 
  			}
		},
		
		...
		
		{
  			module: "MMM-ModuleUpdateNotifier",
  			position: "bottom_bar", 
```

Below is an example with more optional configuration options used in `config/config.js` file:
```
		{
  			module: "MMM-CustomText",
 	 		// Place where you want this message
 	 		position: "top_bar",
  			config: {
			    // Required uniqueID for MMM-ModuleUpdateNotifier
    			uniqueID: "moduleInfo", 
				// Set to blank string
				initialMessage: "Waiting for module information"
  			}
		},
		
		...
		
		{
  			module: "MMM-ModuleUpdateNotifier",
  			position: "bottom_bar", 
 	 		config: {
   				checkIntervalMS: 24 * 60 * 60 * 1000, // every 24 hours
   				customTextUniqueID: "moduleInfo", // Must match uniqueID used in MMM-CustomText config
   				showCounts: false
			}
		},
```


## Future Potential Updates

1. TBD

## Contributing

If you find any problems, bugs or have questions, please [open a GitHub issue](https://github.com/ctd-mh3/MMM-ModuleUpdateNotifier/issues) in this repository.

Pull requests are of course also very welcome 🙂

### Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.