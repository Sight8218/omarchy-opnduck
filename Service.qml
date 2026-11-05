import QtQuick
import Quickshell.Io

// One OPNduck engine for the whole shell (the bar has a widget per monitor).
Item {
  id: root
  visible: false
  width: 0
  height: 0

  property var shell: null
  property var manifest: null
  property var pluginRegistry: null

  property bool backendUp: false
  property bool queuePaused: false
  property var jobs: []
  property string notice: ""
  readonly property string backendFile: Qt.resolvedUrl("backend/opnduck-backend.cjs").toString().replace("file://", "")
  readonly property int activeCount: jobs.filter(function(j) { return j.status === "running" || j.status === "queued" }).length
  readonly property int failedCount: jobs.filter(function(j) { return j.status === "error" }).length

  function startBackend() { if (!backend.running) backend.running = true }
  function send(obj) {
    if (!backend.running) startBackend()
    backend.write(JSON.stringify(obj) + "\n")
  }
  function say(t) { root.notice = t; noticeTimer.restart() }

  Process {
    id: backend
    command: ["node", root.backendFile]
    stdinEnabled: true
    running: true
    stdout: SplitParser {
      onRead: function(line) {
        try {
          var m = JSON.parse(line)
          if (m.type === "ready") root.backendUp = true
          else if (m.type === "tasks") { root.jobs = m.tasks; root.queuePaused = m.paused === true }
          else if (m.type === "error") root.say(m.message)
        } catch (e) {}
      }
    }
    onRunningChanged: if (!running) root.backendUp = false
  }

  Timer { id: noticeTimer; interval: 5000; onTriggered: root.notice = "" }
}
