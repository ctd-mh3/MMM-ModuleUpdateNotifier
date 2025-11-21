
/* MMM-ModuleUpdateNotifier.js */
Module.register("MMM-ModuleUpdateNotifier", {

  defaults: {
    command: "/usr/local/bin/check_for_module_updates.sh",
    checkIntervalInMS: 12 * 60 * 60 * 1000, // 12 hours
    customTextUniqueID: "moduleUpdateNotifier",
    showCounts: true,    // include commit counts in message
    maxNames: 6          // maximum modules to list before truncating
  },

  // Perform startup logic
  start: function () {

    this.logInformation("info", "MMM-ModuleUpdateNotifier: start() called");

    // Hide this module entirely (no UI)
    this.hide(0);

    // Handshake
    this.sendSocketNotification("MODULES_READY");

    var self = this;

    // Perform shallow merge with self.config from MagicMirror/config/config.js having precedence
    // Understand some defaults (e.g., checkIntervalInMS) are not used in MODULES_START_CHECK but for simplicity leaving all defaults in the one structure
    const mergedConfig = { ...defaults, ...(self.config || {}) };

    // Trigger first check immediately, then on interval
    this.sendSocketNotification("MODULES_START_CHECK", this.config);

    // Set check interval to what was provided in config.js or use default
    const checkIntervalInMS = this.config.checkIntervalMS || this.defaults.checkIntervalInMS;

    this.logInformation("info", "MMM-ModuleUpdateNotifier: setting command interval (MS) to " + checkIntervalInMS);

    // Set this check to occur at regular intervals
    setInterval(function() { self.sendSocketNotification("MODULES_START_CHECK", mergedConfig); }, checkIntervalInMS);
  },

  getDom: function () {

    var wrapper = document.createElement("div");
    wrapper.style.display = "none";

    return wrapper;
  },

  socketNotificationReceived: function (notification, payload) {

    if (notification === "MODULES_RESULT"){ 
      this.logInformation("info", "MMM-ModuleUpdateNotifier: socketNotificationReceived() with notification=MODULES_RESULT and payload:" + payload.toString());


      const modules = (payload && payload.modules) ? payload.modules : [];
      this.logInformation("info", "MMM-ModuleUpdateNotifier: socketNotificationReceived() with notification=MODULES_RESULT and modules:" + modules.toString());

      let text = "";

      if (modules.length === 0) {
        // no updates: clear MMM-CustomText (or set a message)
        text = "";
      } else {
        // Build a short list like this to display: "Updates: moduleA (2), moduleB, moduleC (1)"
        const parts = [];
        const max = this.config.maxNames || modules.length;

        for (let i = 0; i < Math.min(modules.length, max); i++) {

          const m = modules[i];

          if (this.config.showCounts && typeof m.count === "number" && m.count > 0) {
            parts.push(`${m.name} (${m.count})`);
          } else {
            parts.push(m.name);
          }

        }

        if (modules.length > max) {
          parts.push(`+${modules.length - max} more`);
        }

        text = `<span style="color:orange; font-weight:bold;">Module update(s) available: ${parts.join(", ")}</span>`;
      }

      this.logInformation("info", "MMM-ModuleUpdateNotifier: Sending CUSTOMTEXT_UPDATE message: " + text + " to uniqueID: " + payload.customTextUniqueID);
      this.sendNotification("CUSTOMTEXT_UPDATE", { message: text, uniqueID: payload.customTextUniqueID});

    } else {
      this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js) ignoring socketNotificationReceived() called with notification:" + notification) 
      // Nothing special to do
    }
  },

  // Log to browser console and server-side
  logInformation: function(level, message) {

    if (level == "info") {
      Log.info(message);
    } else if (level == "warn") {
      Log.warn(message);
    } else {
      Log.error(message);
    }

    // client: send message to node_helper.js for server-side logging
    this.sendSocketNotification("MODULES_CLIENT_LOG", {
        level: level,
        message: message
    });

  }

});
