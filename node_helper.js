/* node_helper.js 
   Place this file in: ~/MagicMirror/modules/MMM-ModuleUpdateNotifier/node_helper.js
*/

const NodeHelper = require("node_helper");
const { exec } = require("child_process");

module.exports = NodeHelper.create({
  start: function () {
    this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js): started");
    this.lastResult = []; // array of { name, count }
  },

  socketNotificationReceived: function (notification, payload) {

    const self = this;

    // Allows MMM-ModuleUpdateNotifier.js to send logging to go into mm log files 
    if (notification === "MODULES_CLIENT_LOG" && payload && payload.message) {

      const logLevel = (payload.level || "info").toLowerCase();
      const logMessage = `[CLIENT_LOG] ${payload.message}`;
      this.logInformation(logLevel, logMessage);
    } else if (notification === "MODULES_READY") {

      // Handshake: client ready -> send last cached result immediately
      this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js): received MODULES_READY, sending MODULES_RESULT w/ lastResult: [" + this.lastResult.toString() + "]");
      this.sendSocketNotification("MODULES_RESULT", { modules: this.lastResult });
    } else if (notification === "MODULES_START_CHECK") {

      this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js): MODULES_START_CHECK received");

      // Configuration from payload
      const command = payload.command;
      const customTextUniqueID = payload.customTextUniqueID;

      // Prepare to run the script file
      const { spawn } = require('child_process');

      // Spawn the command in a login shell
      const child = spawn('/bin/bash', ['-lc', command]);

      let stdoutBuf = "";
      let stderrBuf = "";

      child.stdout.on('data', (chunk) => {
        const s = chunk.toString();
        stdoutBuf += s;
      });

      child.stderr.on('data', (chunk) => {
        const s = chunk.toString();
        stderrBuf += s;
      });

      // capture spawn-level errors
      child.on('error', (err) => {
        this.logInformation("error", "MMM-ModuleUpdateNotifier(node_helper.js): MODULES_START_CHECK spawn error:" + err && err.stack ? err.stack : err);
      });

      // close event gives exit code and signal
      child.on('close', (code, signal) => {

        const out = (stdoutBuf || "").trim();
        const err = (stderrBuf || "").trim();

        /*
        // Uncomment if needed for troubleshooting
        this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js): script stdout:\n" +  out || "(none)");
        this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js): script stderr:\n" + err || "(none)");
        this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js): child exit code:" + code + " signal:" +  signal);
        */

        // Parse stable lines modulename|N from stdout
        const modules = [];
        out.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
            const m = line.match(/^([^|]+)\|(\d+)$/);
            if (m) modules.push({ name: m[1], count: Number(m[2]) });
        });

        // Cache and send result
        this.lastResult = modules;
        this.sendSocketNotification("MODULES_RESULT", {
            modules: modules,
            customTextUniqueID: customTextUniqueID,
	    // Below items are passed just for potential troubleshooting
            raw: out + "\n" + err,
            exitCode: code,
            signal: signal
        });

        // If code !== 0, log an error line so pm2 shows it prominently
        if (code !== 0) {
          this.logInfromation("error", "MMM-ModuleUpdateNotifier(node_helper.js): MODULES_START_CHECK command failed with exit code ${code} signal ${signal}");
	} else {
          this.logInformation("info", "MMM-ModuleUpdateNotifier(node_helper.js): MODULES_START_CHECK finished processing normally");
	}

      });
    } else {
      this.logInformation("info", "cMMM-ModuleUpdateNotifier(node_helper.js) ignoring socketNotificationReceived() called with notification:" + notification) 
      // Nothing special to do
    }
  },

  // Log info
  logInformation: function(level, message) {

    if (level == "info") {
      console.log(message);
    } else if (level == "warn") {
      console.warn(message);
    } else {
      console.error(message);
    }
  }
});
